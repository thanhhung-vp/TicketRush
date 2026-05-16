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
    req.user = { id: 'user-1', role: 'customer' };
    next();
  },
}));

const { default: notificationsRouter } = await import('../routes/notifications.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/notifications', notificationsRouter);
  return app;
}

describe('notification routes', () => {
  beforeEach(() => {
    mockPool.query.mockReset();
  });

  it('lists user notifications with unread count', async () => {
    mockPool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'notification-1', title: 'New event', read_at: null }],
      })
      .mockResolvedValueOnce({ rows: [{ unread_count: 3 }] });

    const response = await request(createApp()).get('/notifications');

    expect(response.status).toBe(200);
    expect(response.body.unread_count).toBe(3);
    expect(response.body.notifications).toHaveLength(1);
    expect(mockPool.query.mock.calls[0][1]).toEqual(['user-1', 20]);
    expect(mockPool.query.mock.calls[1][1]).toEqual(['user-1']);
  });

  it('marks all notifications as read only for the current user', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(createApp()).patch('/notifications/read-all');

    expect(response.status).toBe(200);
    expect(mockPool.query.mock.calls[0][0]).toMatch(/WHERE user_id = \$1 AND read_at IS NULL/i);
    expect(mockPool.query.mock.calls[0][1]).toEqual(['user-1']);
  });

  it('marks one notification as read only when owned by the current user', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: '11111111-1111-4111-8111-111111111111', read_at: '2026-05-16T00:00:00.000Z' }],
    });

    const response = await request(createApp())
      .patch('/notifications/11111111-1111-4111-8111-111111111111/read');

    expect(response.status).toBe(200);
    expect(mockPool.query.mock.calls[0][0]).toMatch(/WHERE id = \$1 AND user_id = \$2/i);
    expect(mockPool.query.mock.calls[0][1]).toEqual([
      '11111111-1111-4111-8111-111111111111',
      'user-1',
    ]);
  });
});
