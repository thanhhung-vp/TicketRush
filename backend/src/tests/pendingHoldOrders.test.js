import { describe, expect, it, vi } from 'vitest';
import {
  cancelPendingOrdersForReleasedSeats,
  createOrReusePendingOrderForSeats,
  sameSeatSet,
} from '../utils/pendingHoldOrders.js';

function createMockClient(results = []) {
  return {
    query: vi.fn()
      .mockImplementation(() => Promise.resolve(results.shift() || { rows: [] })),
  };
}

describe('pending hold orders', () => {
  it('matches seat sets regardless of order', () => {
    expect(sameSeatSet(['seat-2', 'seat-1'], ['seat-1', 'seat-2'])).toBe(true);
    expect(sameSeatSet(['seat-1'], ['seat-1', 'seat-2'])).toBe(false);
  });

  it('reuses an existing pending order for the same held seats', async () => {
    const existingOrder = { id: 'order-1', status: 'pending' };
    const client = createMockClient([{ rows: [existingOrder] }]);

    const order = await createOrReusePendingOrderForSeats(client, {
      userId: 'user-1',
      eventId: 'event-1',
      seats: [
        { id: 'seat-2', price: 200000 },
        { id: 'seat-1', price: 100000 },
      ],
    });

    expect(order).toBe(existingOrder);
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('creates a pending order when no matching pending order exists', async () => {
    const newOrder = { id: 'order-2', status: 'pending', total_amount: '300000' };
    const client = createMockClient([
      { rows: [] },
      { rows: [newOrder] },
      { rows: [] },
    ]);

    const order = await createOrReusePendingOrderForSeats(client, {
      userId: 'user-1',
      eventId: 'event-1',
      seats: [
        { id: 'seat-1', price: 100000 },
        { id: 'seat-2', price: 200000 },
      ],
    });

    expect(order).toEqual(newOrder);
    expect(client.query).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO order_items'),
      ['order-2', 'seat-1', 100000, 'seat-2', 200000]
    );
  });

  it('cancels pending orders for released seats by locked owner', async () => {
    const client = createMockClient([
      { rows: [{ id: 'order-user-1', status: 'cancelled' }] },
      { rows: [{ id: 'order-user-2', status: 'cancelled' }] },
    ]);

    const cancelled = await cancelPendingOrdersForReleasedSeats(client, [
      { id: 'seat-1', locked_by: 'user-1' },
      { id: 'seat-2', locked_by: 'user-1' },
      { id: 'seat-3', locked_by: 'user-2' },
      { id: 'seat-4', locked_by: null },
    ]);

    expect(cancelled).toHaveLength(2);
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("UPDATE orders"),
      ['user-1', ['seat-1', 'seat-2']]
    );
  });
});
