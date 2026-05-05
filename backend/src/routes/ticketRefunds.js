import { Router } from 'express';
import { z } from 'zod';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { recalculateOrderAfterTicketRemoval } from '../utils/orderTotals.js';
import { getTicketRefundBlockReason } from '../utils/ticketRefundRules.js';

const router = Router();
const uuidSchema = z.string().uuid();
const refundRequestSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const errorMessages = {
  ticket_not_found: { status: 404, message: 'Ticket not found or not refundable by you' },
  not_original_buyer: { status: 403, message: 'Transferred tickets cannot be refunded by this account' },
  order_not_paid: { status: 409, message: 'Only paid tickets can be refunded' },
  ticket_checked_in: { status: 409, message: 'Checked-in tickets cannot be refunded' },
  event_ended: { status: 409, message: 'Tickets for past events cannot be refunded' },
  pending_transfer: { status: 409, message: 'Cancel the pending transfer before requesting a refund' },
};

function sendRuleError(res, reason) {
  const mapped = errorMessages[reason] || { status: 400, message: 'Invalid refund request' };
  return res.status(mapped.status).json({ error: mapped.message, code: reason });
}

function broadcastSeatUpdate(app, eventId, seatId) {
  const io = app.get('io');
  if (!io) return;
  io.to(`event:${eventId}`).emit('seats:updated', [{ id: seatId, event_id: eventId, status: 'available' }]);
}

router.use(authenticate);

router.post('/tickets/:ticketId', async (req, res) => {
  const ticketId = uuidSchema.safeParse(req.params.ticketId);
  const body = refundRequestSchema.safeParse(req.body || {});

  if (!ticketId.success) return res.status(400).json({ error: 'Invalid ticket id' });
  if (!body.success) {
    return res.status(400).json({ error: 'Validation failed', details: body.error.flatten() });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: ticketRows } = await client.query(
      `SELECT t.id,
              t.order_id,
              t.user_id,
              t.seat_id,
              t.checked_in_at,
              o.user_id AS order_user_id,
              o.event_id,
              o.status,
              e.event_date,
              s.label,
              z.name AS zone,
              oi.price,
              EXISTS (
                SELECT 1
                FROM ticket_transfers tr
                WHERE tr.ticket_id = t.id
                  AND tr.status = 'pending'
              ) AS has_pending_transfer
       FROM tickets t
       JOIN orders o ON o.id = t.order_id
       JOIN events e ON e.id = o.event_id
       JOIN seats s ON s.id = t.seat_id
       JOIN zones z ON z.id = s.zone_id
       LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.seat_id = t.seat_id
       WHERE t.id = $1 AND t.user_id = $2
       FOR UPDATE OF t, o`,
      [ticketId.data, req.user.id]
    );

    const ticket = ticketRows[0] || null;
    const blockReason = getTicketRefundBlockReason({ ticket });
    if (blockReason) {
      await client.query('ROLLBACK');
      return sendRuleError(res, blockReason);
    }

    await client.query(
      `SELECT id
       FROM ticket_transfers
       WHERE ticket_id = $1 AND status = 'pending'
       FOR UPDATE`,
      [ticket.id]
    );

    const { rows: refundRows } = await client.query(
      `INSERT INTO ticket_refund_requests
         (ticket_id, order_id, event_id, user_id, seat_id, price, reason, status, refund_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'demo')
       RETURNING *`,
      [
        ticket.id,
        ticket.order_id,
        ticket.event_id,
        ticket.user_id,
        ticket.seat_id,
        ticket.price || 0,
        body.data.reason || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      refund: refundRows[0],
      message: 'Refund request submitted and is pending admin approval.',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Refund request already exists for this ticket' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.get('/mine', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*,
              e.title AS event_title,
              e.event_date,
              e.venue,
              s.label,
              z.name AS zone
       FROM ticket_refund_requests r
       LEFT JOIN events e ON e.id = r.event_id
       LEFT JOIN seats s ON s.id = r.seat_id
       LEFT JOIN zones z ON z.id = s.zone_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
