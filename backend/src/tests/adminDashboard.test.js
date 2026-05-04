import { describe, expect, it, vi } from 'vitest';
import {
  adminDashboardOrderTotalsQuery,
  adminDashboardSeatTotalsQuery,
  getAdminDashboard,
  mergeDashboardEvents,
} from '../services/adminDashboard.js';

describe('admin dashboard revenue stats', () => {
  it('keeps paid order totals separate from seat counts', () => {
    expect(adminDashboardOrderTotalsQuery).toMatch(/FROM orders/i);
    expect(adminDashboardOrderTotalsQuery).not.toMatch(/FROM seats|JOIN seats/i);
    expect(adminDashboardSeatTotalsQuery).toMatch(/FROM seats/i);
    expect(adminDashboardSeatTotalsQuery).not.toMatch(/FROM orders|JOIN orders/i);
  });

  it('does not multiply revenue by the number of seats in an event', () => {
    const events = [
      { id: 'event-1', title: 'Concert', event_date: '2026-05-20T12:00:00Z', status: 'on_sale' },
    ];
    const orderTotals = [
      { event_id: 'event-1', total_revenue: '500000', orders_paid: '1' },
    ];
    const seatTotals = [
      {
        event_id: 'event-1',
        sold_seats: '1',
        locked_seats: '0',
        available_seats: '99',
        total_seats: '100',
      },
    ];

    expect(mergeDashboardEvents(events, orderTotals, seatTotals)).toEqual([
      {
        id: 'event-1',
        title: 'Concert',
        event_date: '2026-05-20T12:00:00Z',
        status: 'on_sale',
        total_revenue: '500000',
        orders_paid: '1',
        sold_seats: '1',
        locked_seats: '0',
        available_seats: '99',
        total_seats: '100',
      },
    ]);
  });

  it('returns dashboard data from independent aggregate queries', async () => {
    const responses = [
      { rows: [{ id: 'event-1', title: 'Concert', event_date: '2026-05-20T12:00:00Z', status: 'on_sale' }] },
      { rows: [{ event_id: 'event-1', total_revenue: '500000', orders_paid: '1' }] },
      { rows: [{ event_id: 'event-1', sold_seats: '1', locked_seats: '0', available_seats: '99', total_seats: '100' }] },
      { rows: [{ day: '2026-05-01', revenue: '500000' }] },
    ];
    const pool = {
      query: vi.fn(async () => responses.shift()),
    };

    await expect(getAdminDashboard(pool)).resolves.toEqual({
      events: [
        {
          id: 'event-1',
          title: 'Concert',
          event_date: '2026-05-20T12:00:00Z',
          status: 'on_sale',
          total_revenue: '500000',
          orders_paid: '1',
          sold_seats: '1',
          locked_seats: '0',
          available_seats: '99',
          total_seats: '100',
        },
      ],
      revenue_by_day: [{ day: '2026-05-01', revenue: '500000' }],
    });
    expect(pool.query).toHaveBeenCalledTimes(4);
  });
});
