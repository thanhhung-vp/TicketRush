import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../config/db.js';
import { config } from '../config/index.js';
import { authenticate } from '../middleware/auth.js';
import redis from '../config/redis.js';
import { sendPasswordResetOTP } from '../services/email.js';
import { generateOtp, hashOtp, verifyOtpHash } from '../services/otp.js';
import { emailSchema } from '../utils/emailValidation.js';

const router = Router();
const GOOGLE_STATE_COOKIE = 'ticketrush_google_oauth_state';
const GOOGLE_STATE_COOKIE_PATH = '/api/auth';
const GOOGLE_AUTH_CODE_PREFIX = 'google-auth:';
const GOOGLE_AUTH_CODE_TTL_SECONDS = 60;
const GOOGLE_OAUTH_SCOPE = 'openid email profile';

const googleProfileSchema = z.object({
  sub: z.string().min(1),
  email: emailSchema,
  email_verified: z.union([z.boolean(), z.string()]).optional(),
  name: z.string().trim().optional(),
  picture: z.string().url().optional(),
});

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  const refreshToken = crypto.randomBytes(48).toString('hex');
  return { accessToken, refreshToken };
}

async function storeRefreshToken(userId, rawToken, db = pool) {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000);
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt]
  );
  return hash;
}

function isGoogleLoginConfigured() {
  return Boolean(config.google.clientId && config.google.clientSecret && config.google.redirectUri);
}

function acceptsJson(req) {
  return req.accepts(['json', 'html']) === 'json';
}

function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function buildClientUrl(path, params = {}) {
  const url = new URL(path, config.clientUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

function redirectGoogleError(res, code) {
  return res.redirect(buildClientUrl('/login', { google_error: code }));
}

function setGoogleStateCookie(res, state) {
  res.cookie(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 10 * 60 * 1000,
    path: GOOGLE_STATE_COOKIE_PATH,
  });
}

function clearGoogleStateCookie(res) {
  res.clearCookie(GOOGLE_STATE_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: GOOGLE_STATE_COOKIE_PATH,
  });
}

async function exchangeGoogleCode(code) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) throw new Error('Google token exchange failed');
  const payload = await response.json();
  if (!payload.access_token) throw new Error('Google access token missing');
  return payload.access_token;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error('Google profile request failed');
  const parsed = googleProfileSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('Google profile payload invalid');

  const profile = parsed.data;
  if (profile.email_verified === false || profile.email_verified === 'false') {
    throw new Error('Google email is not verified');
  }

  return profile;
}

async function findOrCreateGoogleUser(profile) {
  const email = profile.email;
  const fullName = profile.name || email.split('@')[0];

  const existing = await pool.query(
    'SELECT id, email, full_name, role, avatar_url FROM users WHERE email = $1',
    [email]
  );
  if (existing.rows[0]) {
    const { rows } = await pool.query(
      `UPDATE users
       SET avatar_url = COALESCE(avatar_url, $2)
       WHERE id = $1
       RETURNING id, email, full_name, role, avatar_url`,
      [existing.rows[0].id, profile.picture || null]
    );
    return rows[0];
  }

  const generatedPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(generatedPassword, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password, full_name, avatar_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role, avatar_url`,
    [email, passwordHash, fullName, profile.picture || null]
  );

  return rows[0];
}

// POST /auth/register
const registerSchema = z.object({
  email:      emailSchema,
  password:   z.string().min(6),
  full_name:  z.string().min(2).max(100),
  gender:     z.enum(['male', 'female', 'other']).optional(),
  birth_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const { email, password, full_name, gender, birth_year } = parsed.data;
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash(password, 12);
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO users (email, password, full_name, gender, birth_year)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, full_name, role, avatar_url`,
      [email, hash, full_name, gender || null, birth_year || null]
    );
    const user = rows[0];
    const { accessToken, refreshToken } = generateTokens(user);
    await storeRefreshToken(user.id, refreshToken, client);
    await client.query('COMMIT');
    res.status(201).json({ accessToken, refreshToken, user });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /auth/login
const loginSchema = z.object({
  email:    emailSchema,
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { accessToken, refreshToken } = generateTokens(user);
    await storeRefreshToken(user.id, refreshToken);
    const { password: _, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /auth/google - start Google OAuth login
router.get('/google', (req, res) => {
  if (!isGoogleLoginConfigured()) {
    if (acceptsJson(req)) {
      return res.status(503).json({ error: 'Google login is not configured' });
    }
    return redirectGoogleError(res, 'not_configured');
  }

  const state = crypto.randomBytes(24).toString('hex');
  setGoogleStateCookie(res, state);

  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleUrl.searchParams.set('client_id', config.google.clientId);
  googleUrl.searchParams.set('redirect_uri', config.google.redirectUri);
  googleUrl.searchParams.set('response_type', 'code');
  googleUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPE);
  googleUrl.searchParams.set('state', state);
  googleUrl.searchParams.set('prompt', 'select_account');

  return res.redirect(googleUrl.toString());
});

async function handleGoogleCallback(req, res) {
  if (!isGoogleLoginConfigured()) return redirectGoogleError(res, 'not_configured');

  const { code, state, error } = req.query;
  if (error) return redirectGoogleError(res, 'cancelled');
  if (
    typeof code !== 'string' ||
    typeof state !== 'string' ||
    getCookieValue(req, GOOGLE_STATE_COOKIE) !== state
  ) {
    clearGoogleStateCookie(res);
    return redirectGoogleError(res, 'invalid_state');
  }

  clearGoogleStateCookie(res);

  try {
    const googleAccessToken = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(googleAccessToken);
    const user = await findOrCreateGoogleUser(profile);
    const { accessToken, refreshToken } = generateTokens(user);
    await storeRefreshToken(user.id, refreshToken);

    const authCode = crypto.randomBytes(32).toString('hex');
    await redis.setex(
      `${GOOGLE_AUTH_CODE_PREFIX}${authCode}`,
      GOOGLE_AUTH_CODE_TTL_SECONDS,
      JSON.stringify({ accessToken, refreshToken, user })
    );

    return res.redirect(buildClientUrl('/auth/google/callback', { code: authCode }));
  } catch (err) {
    console.error(err);
    return redirectGoogleError(res, 'failed');
  }
}

// GET /auth/google/callback - Google redirects here after account consent
router.get('/google/callback', handleGoogleCallback);
router.get('/callback/google', handleGoogleCallback);

// POST /auth/google/complete - exchange one-time local code for app tokens
const googleCompleteSchema = z.object({
  code: z.string().regex(/^[a-f0-9]{64}$/i),
});

router.post('/google/complete', async (req, res) => {
  const parsed = googleCompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const key = `${GOOGLE_AUTH_CODE_PREFIX}${parsed.data.code}`;
  try {
    const payload = await redis.get(key);
    if (!payload) return res.status(401).json({ error: 'Google login session expired' });

    await redis.del(key);
    return res.json(JSON.parse(payload));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  try {
    const { rows } = await pool.query(
      `SELECT rt.*, u.id AS uid, u.email, u.role, u.full_name, u.avatar_url
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
      [hash]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const { uid, email, role, full_name, avatar_url, id: tokenId } = rows[0];
    const user = { id: uid, email, role, full_name, avatar_url };

    // Rotate: delete old, issue new
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenId]);
    const { accessToken, refreshToken: newRefresh } = generateTokens(user);
    await storeRefreshToken(uid, newRefresh);

    res.json({ accessToken, refreshToken: newRefresh, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/logout-all — revoke all sessions
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, gender, birth_year, role, avatar_url, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /auth/profile
const profileSchema = z.object({
  full_name:  z.string().min(2).max(100).optional(),
  gender:     z.enum(['male', 'female', 'other']).optional(),
  birth_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
});

router.patch('/profile', authenticate, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const fields = Object.keys(parsed.data);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => parsed.data[f]);
  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${sets} WHERE id = $1 RETURNING id, email, full_name, gender, birth_year, role, avatar_url`,
      [req.user.id, ...values]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /auth/change-password
const changePasswordSchema = z.object({
  old_password: z.string().min(1),
  new_password: z.string().min(6),
});

router.patch('/change-password', authenticate, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const { old_password, new_password } = parsed.data;

  try {
    const { rows } = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(old_password, user.password))) {
      return res.status(401).json({ error: 'Mật khẩu cũ không chính xác' });
    }

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ ok: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const { email } = parsed.data;

  try {
    const { rows } = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (!rows[0]) {
      // Don't leak whether email exists
      return res.json({ ok: true, message: 'If email exists, OTP sent' });
    }

    const otp = generateOtp();
    await redis.setex(`otp:${email}`, 900, hashOtp(otp)); // 15 mins expiry
    await sendPasswordResetOTP({ to: email, otp });

    res.json({ ok: true, message: 'OTP sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/reset-password
const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: z.string().length(6),
  new_password: z.string().min(6),
});

router.post('/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const { email, otp, new_password } = parsed.data;

  try {
    const savedOtpHash = await redis.get(`otp:${email}`);
    if (!verifyOtpHash(otp, savedOtpHash)) {
      return res.status(401).json({ error: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
    }

    const hash = await bcrypt.hash(new_password, 12);
    const result = await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, email]);
    
    if (result.rowCount === 0) {
       return res.status(404).json({ error: 'User not found' });
    }

    await redis.del(`otp:${email}`);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
    res.json({ ok: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
