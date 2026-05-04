export const adminDashboardEventsQuery = `
  SELECT e.id, e.title, e.event_date, e.status
  FROM events e
  ORDER BY e.event_date DESC
`;

export const adminDashboardOrderTotalsQuery = `
  SELECT event_id,
         COALESCE(SUM(total_amount), 0) AS total_revenue,
         COUNT(*) AS orders_paid
  FROM orders
  WHERE status = 'paid'
  GROUP BY event_id
`;

export const adminDashboardSeatTotalsQuery = `
  SELECT event_id,
         COUNT(*) FILTER (WHERE status = 'sold') AS sold_seats,
         COUNT(*) FILTER (WHERE status = 'locked') AS locked_seats,
         COUNT(*) FILTER (WHERE status = 'available') AS available_seats,
         COUNT(*) AS total_seats
  FROM seats
  GROUP BY event_id
`;

export const adminDashboardRevenueByDayQuery = `
  SELECT DATE(paid_at) AS day, SUM(total_amount) AS revenue
  FROM orders
  WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '30 days'
  GROUP BY day
  ORDER BY day
`;

const emptyOrderTotals = Object.freeze({
  total_revenue: '0',
  orders_paid: '0',
});

const emptySeatTotals = Object.freeze({
  sold_seats: '0',
  locked_seats: '0',
  available_seats: '0',
  total_seats: '0',
});

function indexByEventId(rows) {
  return new Map(rows.map(row => [row.event_id, row]));
}

export function mergeDashboardEvents(events, orderTotals, seatTotals) {
  const orderTotalsByEvent = indexByEventId(orderTotals);
  const seatTotalsByEvent = indexByEventId(seatTotals);

  return events.map(event => {
    const orderStats = orderTotalsByEvent.get(event.id) || emptyOrderTotals;
    const seatStats = seatTotalsByEvent.get(event.id) || emptySeatTotals;

    return {
      ...event,
      total_revenue: orderStats.total_revenue ?? emptyOrderTotals.total_revenue,
      orders_paid: orderStats.orders_paid ?? emptyOrderTotals.orders_paid,
      sold_seats: seatStats.sold_seats ?? emptySeatTotals.sold_seats,
      locked_seats: seatStats.locked_seats ?? emptySeatTotals.locked_seats,
      available_seats: seatStats.available_seats ?? emptySeatTotals.available_seats,
      total_seats: seatStats.total_seats ?? emptySeatTotals.total_seats,
    };
  });
}

export async function getAdminDashboard(pool) {
  const [
    { rows: events },
    { rows: orderTotals },
    { rows: seatTotals },
    { rows: revenueByDay },
  ] = await Promise.all([
    pool.query(adminDashboardEventsQuery),
    pool.query(adminDashboardOrderTotalsQuery),
    pool.query(adminDashboardSeatTotalsQuery),
    pool.query(adminDashboardRevenueByDayQuery),
  ]);

  return {
    events: mergeDashboardEvents(events, orderTotals, seatTotals),
    revenue_by_day: revenueByDay,
  };
}
