import pool from '../pool.js';

export class TicketRepository {
  /**
   * Create a single ticket within a transaction.
   */
  async create(client, { orderId, seatId, userId, qrCode }) {
    const { rows } = await client.query(
      `INSERT INTO tickets (order_id, seat_id, user_id, qr_code)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [orderId, seatId, userId, qrCode]
    );
    return rows[0];
  }

  /**
   * Get all tickets for an order belonging to a specific user,
   * including seat label, zone, event info.
   */
  async findByOrder(orderId, userId) {
    const { rows } = await pool.query(
      `SELECT t.*, s.label, z.name AS zone, e.title AS event_title, e.venue, e.event_date
       FROM tickets t
       JOIN seats  s ON s.id  = t.seat_id
       JOIN zones  z ON z.id  = s.zone_id
       JOIN events e ON e.id  = s.event_id
       WHERE t.order_id = $1 AND t.user_id = $2`,
      [orderId, userId]
    );
    return rows;
  }
}
