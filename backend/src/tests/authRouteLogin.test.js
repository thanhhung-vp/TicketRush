import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPool } = vi.hoisted(() => ({
  mockPool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

vi.mock('../config/db.js', () => ({ default: mockPool }));
vi.mock('../config/redis.js', () => ({
  default: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}));
vi.mock('../services/email.js', () => ({
  sendPasswordResetOTP: vi.fn(),
}));

const originalJwtSecret = process.env.JWT_SECRET;
const originalNodeEnv = process.env.NODE_ENV;

delete process.env.JWT_SECRET;
process.env.NODE_ENV = 'test';

const { default: authRouter } = await import('../routes/auth.js');

function createAuthApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
}

describe('Auth route login flow', () => {
  beforeEach(() => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'test';
    mockPool.query.mockReset();
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('logs in and authorizes /me in local test mode without requiring a .env JWT secret', async () => {
    const password = 'password123';
    const user = {
      id: 42,
      email: 'user@example.com',
      full_name: 'Test User',
      role: 'user',
      password: await bcrypt.hash(password, 12),
    };
    const app = createAuthApp();

    mockPool.query.mockImplementation(async (sql) => {
      if (sql.startsWith('SELECT * FROM users WHERE email')) {
        return { rows: [user] };
      }
      if (sql.startsWith('INSERT INTO refresh_tokens')) {
        return { rows: [] };
      }
      if (sql.startsWith('SELECT id, email, full_name')) {
        return { rows: [{ id: user.id, email: user.email, full_name: user.full_name, role: user.role }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.refreshToken).toEqual(expect.any(String));
    expect(loginResponse.body.user.password).toBeUndefined();

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toMatchObject({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    });
  });
});
