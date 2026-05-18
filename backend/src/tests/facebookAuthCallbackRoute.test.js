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
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
  FACEBOOK_REDIRECT_URI: process.env.FACEBOOK_REDIRECT_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
};

process.env.CLIENT_URL = 'http://localhost:3000';
process.env.SERVER_URL = 'http://localhost:4000';
process.env.FACEBOOK_APP_ID = 'test-facebook-app-id';
process.env.FACEBOOK_APP_SECRET = 'test-facebook-app-secret';
process.env.FACEBOOK_REDIRECT_URI = 'http://localhost:4000/api/auth/facebook/callback';
delete process.env.JWT_SECRET;
process.env.NODE_ENV = 'test';

const { default: authRouter } = await import('../routes/auth.js');

function createAuthApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
}

describe('Facebook OAuth flow', () => {
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

  it('starts Facebook OAuth with a state cookie and Facebook redirect', async () => {
    const response = await request(createAuthApp()).get('/auth/facebook');
    const facebookUrl = new URL(response.headers.location);
    const cookie = response.headers['set-cookie']?.[0] || '';

    expect(response.status).toBe(302);
    expect(facebookUrl.origin).toBe('https://www.facebook.com');
    expect(facebookUrl.pathname).toBe('/v19.0/dialog/oauth');
    expect(facebookUrl.searchParams.get('client_id')).toBe('test-facebook-app-id');
    expect(facebookUrl.searchParams.get('redirect_uri')).toBe('http://localhost:4000/api/auth/facebook/callback');
    expect(facebookUrl.searchParams.get('scope')).toBe('email,public_profile');
    expect(cookie).toMatch(/ticketrush_facebook_oauth_state=/);
    expect(cookie).toMatch(/;\s*Path=\/api\/auth;/);
  });

  it('handles Facebook redirects and stores a one-time app auth code', async () => {
    const app = createAuthApp();
    const startResponse = await request(app).get('/auth/facebook');
    const facebookUrl = new URL(startResponse.headers.location);
    const state = facebookUrl.searchParams.get('state');

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'facebook-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'facebook-user-id',
          email: 'facebook.user@example.com',
          name: 'Facebook User',
          picture: { data: { url: 'https://example.com/facebook-avatar.png' } },
        }),
      });

    const user = {
      id: 9,
      email: 'facebook.user@example.com',
      full_name: 'Facebook User',
      role: 'user',
      avatar_url: 'https://example.com/facebook-avatar.png',
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
      .get(`/auth/facebook/callback?code=facebook-code&state=${state}`)
      .set('Cookie', `ticketrush_facebook_oauth_state=${state}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/^http:\/\/localhost:3000\/auth\/facebook\/callback\?code=[a-f0-9]{64}$/);
    expect(mockRedis.setex).toHaveBeenCalledOnce();
  });
});
