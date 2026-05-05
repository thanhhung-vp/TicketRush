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
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, full_name, role`,
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

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  try {
    const { rows } = await pool.query(
      `SELECT rt.*, u.id AS uid, u.email, u.role, u.full_name
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
      [hash]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const { uid, email, role, full_name, id: tokenId } = rows[0];
    const user = { id: uid, email, role, full_name };

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
      'SELECT id, email, full_name, gender, birth_year, role, created_at FROM users WHERE id=$1',
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
      `UPDATE users SET ${sets} WHERE id = $1 RETURNING id, email, full_name, gender, birth_year, role`,
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
