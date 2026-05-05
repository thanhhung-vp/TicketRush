import { Router } from 'express';
import QRCode from 'qrcode';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { attachDynamicQrToTicket, attachDynamicQrToTickets } from '../utils/ticketQr.js';

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
      `SELECT s.id, s.status, s.locked_by, s.locked_until, s.event_id, z.price,
              (s.locked_until IS NULL OR s.locked_until > NOW()) AS hold_active
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

    const invalid = seats.filter(s => s.status !== 'locked' || !s.hold_active);
    if (invalid.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Some seats are no longer locked (hold may have expired)' });
    }

    const eventIds = new Set(seats.map(s => s.event_id));
    if (eventIds.size !== 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'All seats must belong to the same event' });
    }

    const eventId = seats[0].event_id;

    // Reject checkout on closed, past, or not-yet-open events
    const { rows: [evt] } = await client.query(
      `SELECT status, event_date FROM events WHERE id = $1`,
      [eventId]
    );
    if (!evt || evt.status !== 'on_sale' || new Date(evt.event_date) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Sự kiện không khả dụng để đặt vé.' });
    }

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
    const soldPlaceholders = seat_ids.map((_, i) => `$${i + 2}`).join(',');
    const { rowCount: soldCount } = await client.query(
      `UPDATE seats
       SET status='sold', locked_by=NULL, locked_at=NULL, locked_until=NULL
       WHERE locked_by = $1
         AND status = 'locked'
         AND id IN (${soldPlaceholders})`,
      [req.user.id, ...seat_ids]
    );
    if (soldCount !== seat_ids.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Some seats could not be finalized' });
    }

    // Generate tickets with QR codes
    const tickets = [];
    for (const seat of seats) {
      const payload = JSON.stringify({ ticket_id: null, order_id: order.id, seat_id: seat.id, user_id: req.user.id });
      const qr = await QRCode.toDataURL(payload);
      const { rows: ticketRows } = await client.query(
        `INSERT INTO tickets (order_id, seat_id, user_id, qr_code) VALUES ($1,$2,$3,$4) RETURNING *`,
        [order.id, seat.id, req.user.id, qr]
      );
      tickets.push(await attachDynamicQrToTicket({ ...ticketRows[0], event_id: seat.event_id }));
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
      `WITH visible_orders AS (
         SELECT DISTINCT o.id
         FROM orders o
         LEFT JOIN tickets owned_t ON owned_t.order_id = o.id AND owned_t.user_id = $1
         WHERE (o.user_id = $1 OR owned_t.id IS NOT NULL)
           AND o.status IN ('pending', 'paid', 'cancelled')
       ),
       visible_items AS (
         SELECT o.id AS order_id,
                oi.id AS order_item_id,
                oi.seat_id,
                oi.price,
                s.label,
                s.row_idx,
                s.col_idx,
                z.name AS zone,
                t.id AS ticket_id,
                t.checked_in_at,
                (o.user_id = $1 AND t.id IS NOT NULL AND t.checked_in_at IS NULL) AS can_refund,
                ((o.status = 'pending' AND o.user_id = $1) OR t.id IS NOT NULL) AS is_visible,
                (SELECT status FROM ticket_refund_requests trr WHERE trr.ticket_id = t.id AND trr.status = 'pending' LIMIT 1) AS refund_status
         FROM orders o
         JOIN visible_orders vo ON vo.id = o.id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN tickets t ON t.order_id = o.id AND t.seat_id = oi.seat_id AND t.user_id = $1
         LEFT JOIN seats s ON s.id = oi.seat_id
         LEFT JOIN zones z ON z.id = s.zone_id
       )
       SELECT o.id,
              CASE WHEN o.user_id = $1 THEN o.user_id ELSE $1::uuid END AS user_id,
              o.event_id,
              COALESCE(
                SUM(vi.price) FILTER (WHERE vi.order_item_id IS NOT NULL AND vi.is_visible),
                0
              ) AS total_amount,
              o.status,
              o.created_at,
              o.paid_at,
              e.title AS event_title, e.event_date, e.venue,
              e.poster_url,
              COALESCE(
                json_agg(json_build_object(
                  'ticket_id', vi.ticket_id,
                  'seat_id', vi.seat_id,
                  'label', vi.label,
                  'price', vi.price,
                  'zone', vi.zone,
                  'refund_status', vi.refund_status,
                  'can_refund', (vi.can_refund AND e.event_date > NOW())
                ) ORDER BY vi.zone, vi.row_idx, vi.col_idx)
                FILTER (WHERE vi.order_item_id IS NOT NULL AND vi.is_visible),
                '[]'::json
              ) AS items,
              COALESCE(
                (
                  SELECT json_agg(json_build_object(
                    'action_id', c.action_id,
                    'ticket_id', c.ticket_id,
                    'seat_id', c.seat_id,
                    'label', c.label,
                    'price', c.price,
                    'zone', c.zone,
                    'cancelled_at', c.cancelled_at,
                    'reason', c.reason,
                    'source', c.source
                  ) ORDER BY c.cancelled_at DESC)
                  FROM (
                    SELECT a.id AS action_id,
                           a.ticket_id,
                           a.seat_id,
                           cs.label,
                           a.price,
                           cz.name AS zone,
                           a.created_at AS cancelled_at,
                           a.reason,
                           'admin' AS source
                    FROM admin_ticket_actions a
                    LEFT JOIN seats cs ON cs.id = a.seat_id
                    LEFT JOIN zones cz ON cz.id = cs.zone_id
                    WHERE a.order_id = o.id
                      AND a.user_id = $1
                      AND a.action_type = 'deleted'

                    UNION ALL

                    SELECT r.id AS action_id,
                           r.ticket_id,
                           r.seat_id,
                           rs.label,
                           r.price,
                           rz.name AS zone,
                           r.created_at AS cancelled_at,
                           r.reason,
                           'refund' AS source
                    FROM ticket_refund_requests r
                    LEFT JOIN seats rs ON rs.id = r.seat_id
                    LEFT JOIN zones rz ON rz.id = rs.zone_id
                    WHERE r.order_id = o.id
                      AND r.user_id = $1
                      AND r.status = 'approved'
                  ) c
                ),
                '[]'::json
              ) AS cancelled_items
       FROM visible_orders vo
       JOIN orders o ON o.id = vo.id
       JOIN events e ON e.id = o.event_id
       LEFT JOIN visible_items vi ON vi.order_id = o.id
       GROUP BY o.id, e.id
       ORDER BY COALESCE(o.paid_at, o.created_at) DESC`,
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
      `SELECT t.*, s.event_id, s.label, z.name AS zone, e.title AS event_title, e.venue, e.event_date
       FROM tickets t
       JOIN seats s ON s.id = t.seat_id
       JOIN zones z ON z.id = s.zone_id
       JOIN events e ON e.id = s.event_id
       WHERE t.order_id = $1 AND t.user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json(await attachDynamicQrToTickets(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
