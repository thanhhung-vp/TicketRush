import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// POST /checkin — scan a QR code (admin/staff)
// body: { qr_code }
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { qr_code } = req.body;
  if (!qr_code) return res.status(400).json({ error: 'qr_code required' });

  try {
    // Look up the ticket by qr_code
    const { rows } = await pool.query(
      `SELECT t.id, t.qr_code, t.checked_in_at, t.order_id,
              u.full_name, u.email,
              e.title AS event_title, e.venue, e.event_date,
              s.label AS seat_label,
              z.name  AS zone_name, z.price
       FROM tickets t
       JOIN orders  o ON o.id = t.order_id
       JOIN users   u ON u.id = t.user_id
       JOIN seats   s ON s.id = t.seat_id
       JOIN zones   z ON z.id = s.zone_id
       JOIN events  e ON e.id = o.event_id
       WHERE t.qr_code = $1`,
      [qr_code]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = rows[0];

    if (ticket.checked_in_at) {
      return res.status(409).json({
        error: 'Already checked in',
        checked_in_at: ticket.checked_in_at,
        ticket,
      });
    }

    // Mark as checked in
    await pool.query(
      'UPDATE tickets SET checked_in_at = NOW(), checked_in_by = $1 WHERE id = $2',
      [req.user.id, ticket.id]
    );

    res.json({ ok: true, message: 'Check-in thành công', ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /checkin/stats/:eventId — check-in statistics for an event (admin)
router.get('/stats/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(t.id)                                          AS total_tickets,
         COUNT(t.checked_in_at)                              AS checked_in,
         COUNT(t.id) - COUNT(t.checked_in_at)               AS remaining
       FROM tickets t
       JOIN orders o ON o.id = t.order_id
       WHERE o.event_id = $1 AND o.status = 'paid'`,
      [req.params.eventId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /checkin/list/:eventId — list checked-in tickets (admin)
router.get('/list/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.qr_code, t.checked_in_at,
              u.full_name, u.email,
              s.label AS seat_label, z.name AS zone_name
       FROM tickets t
       JOIN orders  o ON o.id = t.order_id
       JOIN users   u ON u.id = t.user_id
       JOIN seats   s ON s.id = t.seat_id
       JOIN zones   z ON z.id = s.zone_id
       WHERE o.event_id = $1 AND t.checked_in_at IS NOT NULL
       ORDER BY t.checked_in_at DESC`,
      [req.params.eventId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
