import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockClient, mockPool, mockSeatReleaseQueue, mockReleaseQueueSlotAndFill } = vi.hoisted(() => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };

  return {
    mockClient,
    mockPool: {
      connect: vi.fn(),
      query: vi.fn(),
    },
    mockSeatReleaseQueue: {
      add: vi.fn(),
      getJob: vi.fn(),
    },
    mockReleaseQueueSlotAndFill: vi.fn(),
  };
});

vi.mock('../config/db.js', () => ({ default: mockPool }));
vi.mock('../config/redis.js', () => ({ default: null }));
vi.mock('../middleware/auth.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'user-1', role: 'customer', email: 'user@example.com' };
    next();
  },
  requireAdmin: (_req, _res, next) => next(),
}));
vi.mock('../workers/seatRelease.js', () => ({ seatReleaseQueue: mockSeatReleaseQueue }));
vi.mock('../utils/virtualQueueFlow.js', () => ({ releaseQueueSlotAndFill: mockReleaseQueueSlotAndFill }));
vi.mock('../services/notifications.js', () => ({ createNotification: vi.fn() }));
vi.mock('../services/email.js', () => ({ sendOrderConfirmation: vi.fn() }));
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,qr') } }));

const { default: seatsRouter } = await import('../routes/seats.js');
const { default: ordersRouter } = await import('../routes/orders.js');
const { default: paymentRouter } = await import('../routes/payment.js');
const { default: eventsRouter } = await import('../routes/events.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/events', eventsRouter);
  app.use('/seats', seatsRouter);
  app.use('/orders', ordersRouter);
  app.use('/payment', paymentRouter);
  return app;
}

function heldSeat(overrides = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    status: 'locked',
    locked_by: 'user-1',
    locked_until: '2099-01-01T00:10:00.000Z',
    event_id: '22222222-2222-2222-2222-222222222222',
    price: '100000',
    hold_active: true,
    ...overrides,
  };
}

function futureSaleEvent(overrides = {}) {
  return {
    status: 'on_sale',
    event_date: '2099-01-02T00:00:00.000Z',
    sale_start_at: '2099-01-01T00:00:00.000Z',
    queue_enabled: false,
    ...overrides,
  };
}

describe('ticket sale window route guards', () => {
  beforeEach(() => {
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    mockPool.connect.mockReset();
    mockPool.query.mockReset();
    mockSeatReleaseQueue.add.mockReset();
    mockSeatReleaseQueue.getJob.mockReset();
    mockReleaseQueueSlotAndFill.mockReset();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  it('blocks seat holds for scheduled events before sale start', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ ...heldSeat(), status: 'available' }] })
      .mockResolvedValueOnce({ rows: [futureSaleEvent({ status: 'scheduled' })] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(createApp())
      .post('/seats/hold')
      .send({ seat_ids: [heldSeat().id] });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'SALE_NOT_STARTED' });
    expect(mockSeatReleaseQueue.add).not.toHaveBeenCalled();
  });

  it('allows reading scheduled event seats for the read-only overview even when queue is enabled', async () => {
    mockPool.query
      .mockResolvedValueOnce({
        rows: [futureSaleEvent({ status: 'scheduled', queue_enabled: true })],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: heldSeat().id,
          zone_id: 'zone-1',
          row_idx: 0,
          col_idx: 0,
          label: 'A1',
          status: 'available',
          zone_name: 'VIP',
          price: '100000',
          color: '#3B82F6',
          rows: 1,
          cols: 1,
        }],
      });

    const response = await request(createApp()).get('/events/event-1/seats');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ id: heldSeat().id, status: 'available' });
  });

  it('blocks direct checkout when sale_start_at is still in the future', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [heldSeat()] })
      .mockResolvedValueOnce({ rows: [futureSaleEvent()] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(createApp())
      .post('/orders/checkout')
      .send({ seat_ids: [heldSeat().id] });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'SALE_NOT_STARTED' });
  });

  it('blocks payment initiation when sale_start_at is still in the future', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [heldSeat()] })
      .mockResolvedValueOnce({ rows: [futureSaleEvent()] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(createApp())
      .post('/payment/initiate')
      .send({ seat_ids: [heldSeat().id], method: 'mock' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'SALE_NOT_STARTED' });
  });

  it('blocks payment confirmation for existing pending orders before sale start', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: '33333333-3333-3333-3333-333333333333',
          user_id: 'user-1',
          event_id: '22222222-2222-2222-2222-222222222222',
          status: 'pending',
        }],
      })
      .mockResolvedValueOnce({ rows: [futureSaleEvent()] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(createApp())
      .post('/payment/confirm')
      .send({ order_id: '33333333-3333-3333-3333-333333333333', method: 'mock' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'SALE_NOT_STARTED' });
  });
});
