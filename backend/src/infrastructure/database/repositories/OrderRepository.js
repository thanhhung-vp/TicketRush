import pool from '../pool.js';

export class OrderRepository {
  /**
   * Create a new order within a transaction.
   */
  async create(client, { userId, eventId, totalAmount, status = 'pending' }) {
    const { rows } = await client.query(
      `INSERT INTO orders (user_id, event_id, total_amount, status)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [userId, eventId, totalAmount, status]
    );
    return rows[0];
  }

  /**
   * Bulk-insert order items for all seats in an order.
   * seats: array of { id, price }
   */
  async createItems(client, orderId, seats) {
    const itemValues = seats.map((_, i) => `($1,$${i * 2 + 2},$${i * 2 + 3})`).join(',');
    const itemParams = [orderId, ...seats.flatMap(s => [s.id, s.price])];
    await client.query(
      `INSERT INTO order_items (order_id, seat_id, price) VALUES ${itemValues}`,
      itemParams
    );
  }

  /**
   * Get all orders for a user with event info and items JSON.
   */
  async findByUser(userId) {
    const { rows } = await pool.query(
      `SELECT o.*, e.title AS event_title, e.event_date, e.venue,
              e.poster_url,
              json_agg(json_build_object(
                'seat_id', oi.seat_id,
                'label',   s.label,
                'price',   oi.price,
                'zone',    z.name
              )) AS items
       FROM orders o
       JOIN events e      ON e.id  = o.event_id
       JOIN order_items oi ON oi.order_id = o.id
       JOIN seats s        ON s.id  = oi.seat_id
       JOIN zones z        ON z.id  = s.zone_id
       WHERE o.user_id = $1
       GROUP BY o.id, e.id
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return rows;
  }

  /**
   * Find a pending order by id and user, locking the row for update.
   */
  async findPendingByIdAndUser(client, orderId, userId) {
    const { rows } = await client.query(
      `SELECT * FROM orders
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       FOR UPDATE`,
      [orderId, userId]
    );
    return rows[0] || null;
  }

  /**
   * Mark an order as paid.
   */
  async markPaid(client, orderId) {
    await client.query(
      `UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = $1`,
      [orderId]
    );
  }

  /**
   * Mark an order as cancelled.
   */
  async markCancelled(client, orderId) {
    await client.query(
      `UPDATE orders SET status = 'cancelled' WHERE id = $1`,
      [orderId]
    );
  }

  /**
   * Get order items (seat_id, price) for a given order.
   */
  async getItems(orderId) {
    const { rows } = await pool.query(
      `SELECT seat_id, price FROM order_items WHERE order_id = $1`,
      [orderId]
    );
    return rows;
  }
}
