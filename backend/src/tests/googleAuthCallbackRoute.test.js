import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPool, mockRedis } = vi.hoisted(() => ({
  mockPool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
  mockRedis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../config/db.js', () => ({ default: mockPool }));
vi.mock('../config/redis.js', () => ({ default: mockRedis }));
vi.mock('../services/email.js', () => ({
  sendPasswordResetOTP: vi.fn(),
}));

const originalEnv = {
  CLIENT_URL: process.env.CLIENT_URL,
  SERVER_URL: process.env.SERVER_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
};

process.env.CLIENT_URL = 'http://localhost:3000';
process.env.SERVER_URL = 'http://localhost:4000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';
delete process.env.JWT_SECRET;
process.env.NODE_ENV = 'test';

const { default: authRouter } = await import('../routes/auth.js');

function createAuthApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
}

describe('Google OAuth callback compatibility route', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
    mockRedis.get.mockReset();
    mockRedis.setex.mockReset();
    mockRedis.del.mockReset();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('sets the Google OAuth state cookie for both supported callback paths', async () => {
    const response = await request(createAuthApp()).get('/auth/google');
    const cookie = response.headers['set-cookie']?.[0] || '';

    expect(response.status).toBe(302);
    expect(cookie).toMatch(/;\s*Path=\/api\/auth;/);
  });

  it('handles Google redirects to /auth/callback/google', async () => {
    const app = createAuthApp();
    const startResponse = await request(app).get('/auth/google');
    const googleUrl = new URL(startResponse.headers.location);
    const state = googleUrl.searchParams.get('state');

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'google-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'google-subject',
          email: 'google.user@example.com',
          email_verified: true,
          name: 'Google User',
          picture: 'https://example.com/avatar.png',
        }),
      });

    const user = {
      id: 7,
      email: 'google.user@example.com',
      full_name: 'Google User',
      role: 'user',
      avatar_url: 'https://example.com/avatar.png',
    };

    mockPool.query.mockImplementation(async (sql) => {
      if (sql.startsWith('SELECT id, email, full_name, role, avatar_url FROM users WHERE email')) {
        return { rows: [user] };
      }
      if (sql.startsWith('UPDATE users')) {
        return { rows: [user] };
      }
      if (sql.startsWith('INSERT INTO refresh_tokens')) {
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    mockRedis.setex.mockResolvedValue('OK');

    const response = await request(app)
      .get(`/auth/callback/google?code=google-code&state=${state}`)
      .set('Cookie', `ticketrush_google_oauth_state=${state}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/^http:\/\/localhost:3000\/auth\/google\/callback\?code=[a-f0-9]{64}$/);
    expect(mockRedis.setex).toHaveBeenCalledOnce();
  });
});
