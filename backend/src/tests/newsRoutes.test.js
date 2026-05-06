import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPool } = vi.hoisted(() => ({
  mockPool: {
    query: vi.fn(),
  },
}));

vi.mock('../config/db.js', () => ({ default: mockPool }));
vi.mock('../middleware/auth.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'admin-user-id', role: 'admin' };
    next();
  },
  requireAdmin: (_req, _res, next) => next(),
}));

const { default: newsRouter } = await import('../routes/news.js');
const { default: adminRouter } = await import('../routes/admin.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/news', newsRouter);
  app.use('/admin', adminRouter);
  return app;
}

describe('news routes', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
  });

  it('lists only published news for public visitors', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'news-1',
          title: 'Concert update',
          summary: 'New gate opens soon',
          content: 'Full article',
          image_url: null,
          status: 'published',
          published_at: '2026-05-06T10:00:00.000Z',
        },
      ],
    });

    const response = await request(createApp()).get('/news?limit=3');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ title: 'Concert update', status: 'published' });
    expect(mockPool.query.mock.calls[0][0]).toMatch(/WHERE status = 'published'/i);
    expect(mockPool.query.mock.calls[0][1]).toEqual([3]);
  });

  it('lets admins create a published news post', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'news-2',
          title: 'Venue notice',
          summary: 'Bring your ID',
          content: 'Please bring your ID to the gate.',
          image_url: null,
          status: 'published',
          created_by: 'admin-user-id',
        },
      ],
    });

    const response = await request(createApp())
      .post('/admin/news')
      .send({
        title: 'Venue notice',
        summary: 'Bring your ID',
        content: 'Please bring your ID to the gate.',
        status: 'published',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: 'news-2', title: 'Venue notice', status: 'published' });
    expect(mockPool.query.mock.calls[0][0]).toMatch(/INSERT INTO news_posts/i);
    expect(mockPool.query.mock.calls[0][1]).toContain('admin-user-id');
  });

  it('rejects invalid admin news payloads', async () => {
    const response = await request(createApp())
      .post('/admin/news')
      .send({ title: 'No', content: '' });

    expect(response.status).toBe(400);
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});
