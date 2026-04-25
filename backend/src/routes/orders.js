import { Router } from 'express';
import QRCode from 'qrcode';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * POST /orders/checkout
 * Body: { seat_ids: string[] }
 * "Thanh toán" (giả lập): chuyển locked → sold, tạo order + tickets.
 */
router.post('/checkout', authenticate, async (req, res) => {
  const { seat_ids } = req.body;
  if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
    return res.status(400).json({ error: 'seat_ids required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify all seats are locked by this user
    const placeholders = seat_ids.map((_, i) => `$${i + 2}`).join(',');
    const { rows: seats } = await client.query(
      `SELECT s.id, s.status, s.locked_by, s.event_id, z.price
       FROM seats s
       JOIN zones z ON z.id = s.zone_id
       WHERE s.id IN (${placeholders}) AND s.locked_by = $1
       FOR UPDATE`,
      [req.user.id, ...seat_ids]
    );

    if (seats.length !== seat_ids.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Seats not found or not held by you' });
    }

    const invalid = seats.filter(s => s.status !== 'locked');
    if (invalid.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Some seats are no longer locked (hold may have expired)' });
    }

    const eventId = seats[0].event_id;
    const total = seats.reduce((sum, s) => sum + Number(s.price), 0);

    // Create order
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, event_id, total_amount, status, paid_at)
       VALUES ($1,$2,$3,'paid',NOW()) RETURNING *`,
      [req.user.id, eventId, total]
    );
    const order = orderRows[0];

    // Create order items
    const itemValues = seats.map((_, i) => `($1,$${i * 2 + 2},$${i * 2 + 3})`).join(',');
    const itemParams = [order.id, ...seats.flatMap(s => [s.id, s.price])];
    await client.query(
      `INSERT INTO order_items (order_id, seat_id, price) VALUES ${itemValues}`,
      itemParams
    );

    // Mark seats as sold
    const soldPlaceholders = seat_ids.map((_, i) => `$${i + 1}`).join(',');
    await client.query(
      `UPDATE seats SET status='sold', locked_by=NULL, locked_at=NULL
       WHERE id IN (${soldPlaceholders})`,
      seat_ids
    );

    // Generate tickets with QR codes
    const tickets = [];
    for (const seat of seats) {
      const payload = JSON.stringify({ ticket_id: null, order_id: order.id, seat_id: seat.id, user_id: req.user.id });
      const qr = await QRCode.toDataURL(payload);
      const { rows: ticketRows } = await client.query(
        `INSERT INTO tickets (order_id, seat_id, user_id, qr_code) VALUES ($1,$2,$3,$4) RETURNING *`,
        [order.id, seat.id, req.user.id, qr]
      );
      tickets.push(ticketRows[0]);
    }

    await client.query('COMMIT');

    // Broadcast sold status to event room
    const io = req.app.get('io');
    if (io) {
      io.to(`event:${eventId}`).emit('seats:updated',
        seats.map(s => ({ id: s.id, event_id: s.event_id, status: 'sold' }))
      );
    }

    res.status(201).json({ order, tickets });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /orders - my orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, e.title AS event_title, e.event_date, e.venue,
              e.poster_url,
              json_agg(json_build_object(
                'seat_id', oi.seat_id,
                'label', s.label,
                'price', oi.price,
                'zone', z.name
              )) AS items
       FROM orders o
       JOIN events e ON e.id = o.event_id
       JOIN order_items oi ON oi.order_id = o.id
       JOIN seats s ON s.id = oi.seat_id
       JOIN zones z ON z.id = s.zone_id
       WHERE o.user_id = $1
       GROUP BY o.id, e.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /orders/:id/tickets
router.get('/:id/tickets', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, s.label, z.name AS zone, e.title AS event_title, e.venue, e.event_date
       FROM tickets t
       JOIN seats s ON s.id = t.seat_id
       JOIN zones z ON z.id = s.zone_id
       JOIN events e ON e.id = s.event_id
       WHERE t.order_id = $1 AND t.user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
