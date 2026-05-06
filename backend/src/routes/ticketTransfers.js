import { Router } from 'express';
import { z } from 'zod';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { emailSchema } from '../utils/emailValidation.js';

const router = Router();
const uuidSchema = z.string().uuid();
const transferRequestSchema = z.object({
  recipient_email: emailSchema,
});

const ACTIONS = new Set(['accept', 'decline', 'cancel']);

router.use(authenticate);

function sendTransferError(res, status, error, code) {
  return res.status(status).json({ error, code });
}

function assertPendingTransferOwner(transfer, userId, action) {
  if (action === 'cancel') return transfer.sender_user_id === userId;
  return transfer.recipient_user_id === userId;
}

function buildTransferListQuery(whereClause) {
  return `
    SELECT tr.id,
           tr.ticket_id,
           tr.status,
           tr.created_at,
           tr.resolved_at,
           sender.email AS sender_email,
           sender.full_name AS sender_name,
           recipient.email AS recipient_email,
           recipient.full_name AS recipient_name,
           e.title AS event_title,
           e.event_date,
           e.venue,
           s.label,
           z.name AS zone,
           oi.price
    FROM ticket_transfers tr
    JOIN users sender ON sender.id = tr.sender_user_id
    JOIN users recipient ON recipient.id = tr.recipient_user_id
    JOIN events e ON e.id = tr.event_id
    LEFT JOIN seats s ON s.id = tr.seat_id
    LEFT JOIN zones z ON z.id = s.zone_id
    LEFT JOIN order_items oi ON oi.order_id = tr.order_id AND oi.seat_id = tr.seat_id
    WHERE ${whereClause}
    ORDER BY tr.created_at DESC
    LIMIT 50
  `;
}

router.get('/incoming', async (req, res) => {
  try {
    const { rows } = await pool.query(
      buildTransferListQuery(`tr.recipient_user_id = $1 AND tr.status = 'pending'`),
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/outgoing', async (req, res) => {
  try {
    const { rows } = await pool.query(
      buildTransferListQuery(`tr.sender_user_id = $1 AND tr.status = 'pending'`),
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/tickets/:ticketId', async (req, res) => {
  const ticketId = uuidSchema.safeParse(req.params.ticketId);
  const body = transferRequestSchema.safeParse(req.body || {});

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
              o.event_id,
              o.status,
              e.event_date,
              oi.price,
              EXISTS (
                SELECT 1
                FROM ticket_transfers tr
                WHERE tr.ticket_id = t.id
                  AND tr.status = 'pending'
              ) AS has_pending_transfer,
              EXISTS (
                SELECT 1
                FROM ticket_refund_requests rr
                WHERE rr.ticket_id = t.id
                  AND rr.status = 'pending'
              ) AS has_pending_refund
       FROM tickets t
       JOIN orders o ON o.id = t.order_id
       JOIN events e ON e.id = o.event_id
       LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.seat_id = t.seat_id
       WHERE t.id = $1 AND t.user_id = $2
       FOR UPDATE OF t, o`,
      [ticketId.data, req.user.id]
    );

    const ticket = ticketRows[0] || null;
    if (!ticket) {
      await client.query('ROLLBACK');
      return sendTransferError(res, 404, 'Ticket not found or not transferable by you', 'ticket_not_found');
    }
    if (ticket.status !== 'paid') {
      await client.query('ROLLBACK');
      return sendTransferError(res, 409, 'Only paid tickets can be transferred', 'order_not_paid');
    }
    if (ticket.checked_in_at) {
      await client.query('ROLLBACK');
      return sendTransferError(res, 409, 'Checked-in tickets cannot be transferred', 'ticket_checked_in');
    }
    if (new Date(ticket.event_date) <= new Date()) {
      await client.query('ROLLBACK');
      return sendTransferError(res, 409, 'Tickets for past events cannot be transferred', 'event_ended');
    }
    if (ticket.has_pending_transfer) {
      await client.query('ROLLBACK');
      return sendTransferError(res, 409, 'Ticket already has a pending transfer', 'pending_transfer');
    }
    if (ticket.has_pending_refund) {
      await client.query('ROLLBACK');
      return sendTransferError(res, 409, 'Ticket has a pending refund request', 'pending_refund');
    }

    const { rows: recipientRows } = await client.query(
      `SELECT id, email
       FROM users
       WHERE LOWER(email) = LOWER($1)
         AND role = 'customer'
       LIMIT 1`,
      [body.data.recipient_email]
    );
    const recipient = recipientRows[0] || null;
    if (!recipient) {
      await client.query('ROLLBACK');
      return sendTransferError(res, 404, 'Recipient account not found', 'recipient_not_found');
    }
    if (recipient.id === req.user.id) {
      await client.query('ROLLBACK');
      return sendTransferError(res, 400, 'Cannot transfer a ticket to yourself', 'self_transfer');
    }

    const { rows: transferRows } = await client.query(
      `INSERT INTO ticket_transfers
         (ticket_id, order_id, event_id, seat_id, sender_user_id, recipient_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [ticket.id, ticket.order_id, ticket.event_id, ticket.seat_id, req.user.id, recipient.id]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      transfer: transferRows[0],
      message: 'Transfer request sent.',
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ticket already has a pending transfer', code: 'pending_transfer' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.post('/:transferId/:action', async (req, res) => {
  const transferId = uuidSchema.safeParse(req.params.transferId);
  const action = String(req.params.action || '');

  if (!transferId.success) return res.status(400).json({ error: 'Invalid transfer id' });
  if (!ACTIONS.has(action)) return res.status(400).json({ error: 'Invalid transfer action' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: transferRows } = await client.query(
      `SELECT tr.*,
              t.user_id AS ticket_user_id,
              t.checked_in_at,
              e.event_date
       FROM ticket_transfers tr
       JOIN tickets t ON t.id = tr.ticket_id
       JOIN events e ON e.id = tr.event_id
       WHERE tr.id = $1
       FOR UPDATE OF tr, t`,
      [transferId.data]
    );

    const transfer = transferRows[0] || null;
    if (!transfer) {
      await client.query('ROLLBACK');
      return sendTransferError(res, 404, 'Transfer request not found', 'transfer_not_found');
    }
    if (transfer.status !== 'pending') {
      await client.query('ROLLBACK');
      return sendTransferError(res, 409, 'Transfer request is not pending', 'transfer_not_pending');
    }
    if (!assertPendingTransferOwner(transfer, req.user.id, action)) {
      await client.query('ROLLBACK');
      return sendTransferError(res, 403, 'You cannot update this transfer request', 'forbidden');
    }

    if (action === 'accept') {
      if (transfer.ticket_user_id !== transfer.sender_user_id) {
        await client.query('ROLLBACK');
        return sendTransferError(res, 409, 'Ticket is no longer owned by the sender', 'ticket_owner_changed');
      }
      if (transfer.checked_in_at) {
        await client.query('ROLLBACK');
        return sendTransferError(res, 409, 'Checked-in tickets cannot be transferred', 'ticket_checked_in');
      }
      if (new Date(transfer.event_date) <= new Date()) {
        await client.query('ROLLBACK');
        return sendTransferError(res, 409, 'Tickets for past events cannot be transferred', 'event_ended');
      }

      await client.query(
        `UPDATE tickets
         SET user_id = $1
         WHERE id = $2`,
        [transfer.recipient_user_id, transfer.ticket_id]
      );
    }

    const nextStatus = action === 'accept'
      ? 'accepted'
      : action === 'decline'
        ? 'declined'
        : 'cancelled';

    const { rows: updatedRows } = await client.query(
      `UPDATE ticket_transfers
       SET status = $2,
           resolved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [transfer.id, nextStatus]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, transfer: updatedRows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
