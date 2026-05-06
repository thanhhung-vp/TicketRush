export function sameSeatSet(left = [], right = []) {
  if (left.length !== right.length) return false;

  const sortedLeft = [...left].map(String).sort();
  const sortedRight = [...right].map(String).sort();
  return sortedLeft.every((seatId, index) => seatId === sortedRight[index]);
}

function getSortedSeatIds(seats = []) {
  return seats.map(seat => seat.id).map(String).sort();
}

function getOrderTotal(seats = []) {
  return seats.reduce((sum, seat) => sum + Number(seat.price || 0), 0);
}

export async function findReusablePendingOrderForSeats(client, { userId, seatIds }) {
  if (!Array.isArray(seatIds) || seatIds.length === 0) return null;

  const sortedSeatIds = [...seatIds].map(String).sort();
  const { rows } = await client.query(
    `WITH matching_orders AS (
       SELECT o.id
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
         AND o.status = 'pending'
       GROUP BY o.id
       HAVING array_agg(oi.seat_id ORDER BY oi.seat_id) = $2::uuid[]
     )
     SELECT o.*
     FROM orders o
     JOIN matching_orders mo ON mo.id = o.id
     ORDER BY o.created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [userId, sortedSeatIds]
  );
  return rows[0] || null;
}

export async function createPendingOrderForSeats(client, { userId, eventId, seats }) {
  const total = getOrderTotal(seats);
  const { rows } = await client.query(
    `INSERT INTO orders (user_id, event_id, total_amount, status)
     VALUES ($1,$2,$3,'pending') RETURNING *`,
    [userId, eventId, total]
  );
  const order = rows[0];

  const itemValues = seats.map((_, index) => `($1,$${index * 2 + 2},$${index * 2 + 3})`).join(',');
  const itemParams = [order.id, ...seats.flatMap(seat => [seat.id, seat.price])];
  await client.query(
    `INSERT INTO order_items (order_id, seat_id, price) VALUES ${itemValues}`,
    itemParams
  );

  return order;
}

export async function createOrReusePendingOrderForSeats(client, { userId, eventId, seats }) {
  const seatIds = getSortedSeatIds(seats);
  const existingOrder = await findReusablePendingOrderForSeats(client, { userId, seatIds });
  if (existingOrder) return existingOrder;

  return createPendingOrderForSeats(client, { userId, eventId, seats });
}

export async function cancelPendingOrdersForSeatIds(client, { userId, seatIds }) {
  if (!userId || !Array.isArray(seatIds) || seatIds.length === 0) return [];

  const { rows } = await client.query(
    `UPDATE orders o
     SET status = 'cancelled'
     WHERE o.user_id = $1
       AND o.status = 'pending'
       AND EXISTS (
         SELECT 1
         FROM order_items oi
         WHERE oi.order_id = o.id
           AND oi.seat_id = ANY($2::uuid[])
       )
     RETURNING o.*`,
    [userId, seatIds]
  );
  return rows;
}

export async function cancelPendingOrdersForReleasedSeats(client, releasedSeats = []) {
  const seatIdsByUser = releasedSeats.reduce((groups, seat) => {
    if (!seat.locked_by) return groups;
    const nextGroups = new Map(groups);
    const currentSeatIds = nextGroups.get(seat.locked_by) || [];
    nextGroups.set(seat.locked_by, [...currentSeatIds, seat.id]);
    return nextGroups;
  }, new Map());

  const cancelled = [];
  for (const [userId, seatIds] of seatIdsByUser.entries()) {
    const rows = await cancelPendingOrdersForSeatIds(client, { userId, seatIds });
    cancelled.push(...rows);
  }
  return cancelled;
}
