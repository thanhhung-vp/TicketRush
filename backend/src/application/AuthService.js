import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../infrastructure/database/repositories/UserRepository.js';
import { AuthError, ConflictError, ValidationError } from '../domain/errors/AppError.js';
import { config } from '../config/index.js';

const userRepo = new UserRepository();

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function issueTokenPair(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  const refreshToken = crypto.randomBytes(48).toString('hex');
  return { accessToken, refreshToken };
}

async function persistRefreshToken(userId, rawToken) {
  const hash      = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresInDays * 86_400_000);
  await userRepo.storeRefreshToken(userId, hash, expiresAt);
}

export class AuthService {
  async register({ email, password, full_name, gender, birth_year }) {
    const existing = await userRepo.findByEmail(email);
    if (existing) throw new ConflictError('Email already exists');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userRepo.create({ email, passwordHash, full_name, gender, birth_year });
    const { accessToken, refreshToken } = issueTokenPair(user);
    await persistRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken, user };
  }

  async login({ email, password }) {
    const user = await userRepo.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AuthError('Invalid credentials');
    }
    const { accessToken, refreshToken } = issueTokenPair(user);
    await persistRefreshToken(user.id, refreshToken);
    const { password: _, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
  }

  async refresh(rawToken) {
    if (!rawToken) throw new ValidationError('refreshToken required');
    const hash = hashToken(rawToken);
    const record = await userRepo.findRefreshToken(hash);
    if (!record) throw new AuthError('Invalid or expired refresh token');
    const user = { id: record.uid, email: record.email, role: record.role, full_name: record.full_name };
    await userRepo.deleteRefreshToken(hash);
    const { accessToken, refreshToken } = issueTokenPair(user);
    await persistRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken, user };
  }

  async logout(rawToken) {
    if (!rawToken) throw new ValidationError('refreshToken required');
    await userRepo.deleteRefreshToken(hashToken(rawToken));
  }

  async logoutAll(userId) {
    await userRepo.deleteAllRefreshTokens(userId);
  }

  async getMe(userId) {
    const user = await userRepo.findById(userId);
    if (!user) throw new AuthError('User not found');
    return user;
  }

  async updateProfile(userId, fields) {
    const user = await userRepo.update(userId, fields);
    if (!user) throw new AuthError('User not found');
    return user;
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch {
      throw new AuthError('Invalid token');
    }
  }
}
