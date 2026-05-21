import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockClient, mockPool, mockRedis } = vi.hoisted(() => ({
  mockClient: {
    query: vi.fn(),
    release: vi.fn(),
  },
  mockPool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
  mockRedis: {
    eval: vi.fn(),
    get: vi.fn(),
    getdel: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../config/db.js', () => ({ default: mockPool }));
vi.mock('../config/redis.js', () => ({ default: mockRedis }));
vi.mock('../services/email.js', () => ({
  sendPasswordResetOTP: vi.fn(),
}));

const originalJwtSecret = process.env.JWT_SECRET;
const originalNodeEnv = process.env.NODE_ENV;

delete process.env.JWT_SECRET;
process.env.NODE_ENV = 'test';

const { default: authRouter } = await import('../routes/auth.js');
const { hashOtp } = await import('../services/otp.js');

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
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    mockPool.query.mockReset();
    mockPool.connect.mockReset();
    mockRedis.eval.mockReset();
    mockRedis.get.mockReset();
    mockRedis.getdel.mockReset();
    mockRedis.setex.mockReset();
    mockRedis.del.mockReset();
  });

  it('registers gender and full date of birth', async () => {
    const app = createAuthApp();

    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockImplementation(async (sql, params = []) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
      if (sql.startsWith('INSERT INTO users')) {
        expect(params).toContain('female');
        expect(params).toContain('1996-02-29');
        expect(params).toContain(1996);
        return {
          rows: [{
            id: 'user-1',
            email: 'user@example.com',
            full_name: 'Test User',
            gender: 'female',
            birth_date: '1996-02-29',
            birth_year: 1996,
            role: 'customer',
          }],
        };
      }
      if (sql.startsWith('INSERT INTO refresh_tokens')) return { rows: [] };
      throw new Error(`Unexpected query: ${sql}`);
    });

    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'user@example.com',
        password: 'Ticket123',
        full_name: 'Test User',
        gender: 'female',
        birth_date: '1996-02-29',
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      gender: 'female',
      birth_date: '1996-02-29',
      birth_year: 1996,
    });
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('rejects weak passwords during registration', async () => {
    const app = createAuthApp();

    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'weak@example.com',
        password: 'password123',
        full_name: 'Weak Password',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Mật khẩu phải có độ bảo mật từ trung bình trở lên');
    expect(mockPool.connect).not.toHaveBeenCalled();
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

    const decoded = jwt.decode(loginResponse.body.accessToken);
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);

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

  it('reports when Google login is not configured', async () => {
    const response = await request(createAuthApp())
      .get('/auth/google')
      .set('Accept', 'application/json');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ error: 'Google login is not configured' });
  });

  it('updates structured address fields on the authenticated profile', async () => {
    const password = 'password123';
    const user = {
      id: 42,
      email: 'user@example.com',
      full_name: 'Test User',
      role: 'customer',
      password: await bcrypt.hash(password, 12),
    };
    const app = createAuthApp();

    mockPool.query.mockImplementation(async (sql, params) => {
      if (sql.startsWith('SELECT * FROM users WHERE email')) {
        return { rows: [user] };
      }
      if (sql.startsWith('INSERT INTO refresh_tokens')) {
        return { rows: [] };
      }
      if (sql.startsWith('UPDATE users SET')) {
        expect(params).toContain('other');
        expect(params).toContain('1998-07-20');
        expect(params).toContain(1998);
        expect(params).toContain('1');
        expect(params).toContain('Thành phố Hà Nội');
        expect(params).toContain('4');
        expect(params).toContain('Phường Ba Đình');
        expect(params).toContain('Khu phố 3');
        expect(params).toContain('Số 12 đường Lê Lợi');
        return {
          rows: [{
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            gender: 'other',
            birth_date: '1998-07-20',
            birth_year: 1998,
            address_province_code: '1',
            address_province_name: 'Thành phố Hà Nội',
            address_ward_code: '4',
            address_ward_name: 'Phường Ba Đình',
            address_hamlet: 'Khu phố 3',
            address_line: 'Số 12 đường Lê Lợi',
          }],
        };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password });

    const profileResponse = await request(app)
      .patch('/auth/profile')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        gender: 'other',
        birth_date: '1998-07-20',
        address_province_code: '1',
        address_province_name: 'Thành phố Hà Nội',
        address_ward_code: '4',
        address_ward_name: 'Phường Ba Đình',
        address_hamlet: 'Khu phố 3',
        address_line: 'Số 12 đường Lê Lợi',
      });

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body).toMatchObject({
      gender: 'other',
      birth_date: '1998-07-20',
      birth_year: 1998,
      address_province_name: 'Thành phố Hà Nội',
      address_ward_name: 'Phường Ba Đình',
      address_hamlet: 'Khu phố 3',
      address_line: 'Số 12 đường Lê Lợi',
    });
  });

  it('consumes a password reset OTP once so it cannot be reused', async () => {
    const email = 'user@example.com';
    const otp = '123456';
    const userId = 'user-1';
    const currentPasswordHash = await bcrypt.hash('Current123', 12);
    const app = createAuthApp();

    mockRedis.eval
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    mockPool.query.mockImplementation(async (sql) => {
      if (sql.startsWith('SELECT id, password FROM users WHERE email')) {
        return { rows: [{ id: userId, password: currentPasswordHash }] };
      }
      if (sql.startsWith('UPDATE users SET password')) {
        return { rowCount: 1, rows: [] };
      }
      if (sql.startsWith('DELETE FROM refresh_tokens')) {
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const firstResponse = await request(app)
      .post('/auth/reset-password')
      .send({ email, otp, new_password: 'newpassword123' });
    const secondResponse = await request(app)
      .post('/auth/reset-password')
      .send({ email, otp, new_password: 'newpassword456' });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(401);
    expect(mockRedis.eval).toHaveBeenCalledTimes(2);
    expect(mockRedis.eval.mock.calls[0]).toEqual([
      expect.any(String),
      1,
      `otp:${email}`,
      hashOtp(otp),
    ]);
    expect(mockPool.query.mock.calls.filter(([sql]) => sql.startsWith('UPDATE users SET password'))).toHaveLength(1);
  });

  it('rejects changing to the same password', async () => {
    const password = 'Current123';
    const user = {
      id: 42,
      email: 'user@example.com',
      full_name: 'Test User',
      role: 'customer',
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
      if (sql.startsWith('SELECT password FROM users WHERE id')) {
        return { rows: [{ password: user.password }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password });

    const response = await request(app)
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({ old_password: password, new_password: password });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Mật khẩu mới không được trùng mật khẩu cũ');
    expect(mockPool.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE users SET password'))).toBe(false);
  });

  it('rejects reset password when the new password matches the old password', async () => {
    const email = 'user@example.com';
    const otp = '123456';
    const password = 'Current123';
    const app = createAuthApp();

    mockRedis.eval.mockResolvedValueOnce(1);
    mockPool.query.mockImplementation(async (sql) => {
      if (sql.startsWith('SELECT id, password FROM users WHERE email')) {
        return { rows: [{ id: 'user-1', password: await bcrypt.hash(password, 12) }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const response = await request(app)
      .post('/auth/reset-password')
      .send({ email, otp, new_password: password });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Mật khẩu mới không được trùng mật khẩu cũ');
    expect(mockRedis.eval).toHaveBeenCalledTimes(1);
    expect(mockPool.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE users SET password'))).toBe(false);
  });
});
