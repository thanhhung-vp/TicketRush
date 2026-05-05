import { describe, expect, it, vi } from 'vitest';
import { recalculateOrderAfterTicketRemoval } from '../utils/orderTotals.js';

function createClientWithOrderStats(stats, updatedOrder) {
  return {
    query: vi.fn()
      .mockResolvedValueOnce({ rows: [stats] })
      .mockResolvedValueOnce({ rows: [updatedOrder] }),
  };
}

describe('order total helpers', () => {
  it('updates order total and preserves status when items remain', async () => {
    const client = createClientWithOrderStats(
      { total_amount: '250000', item_count: 2 },
      { id: 'order-1', total_amount: '250000', status: 'paid' }
    );

    const result = await recalculateOrderAfterTicketRemoval(client, 'order-1');

    expect(client.query).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE orders'),
      ['order-1', 250000, 2]
    );
    expect(result).toMatchObject({ id: 'order-1', status: 'paid' });
  });

  it('cancels the order when no items remain', async () => {
    const client = createClientWithOrderStats(
      { total_amount: '0', item_count: 0 },
      { id: 'order-1', total_amount: '0', status: 'cancelled' }
    );

    const result = await recalculateOrderAfterTicketRemoval(client, 'order-1');

    expect(client.query).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE orders'),
      ['order-1', 0, 0]
    );
    expect(result).toMatchObject({ id: 'order-1', status: 'cancelled' });
  });
});
