import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { seatReleaseQueue } from '../workers/seatRelease.js';

const router = Router();

const HOLD_MINUTES = Number(process.env.SEAT_HOLD_MINUTES) || 10;
const HOLD_MS = HOLD_MINUTES * 60 * 1000;

// ── Helper: broadcast seat status changes to all clients in the event room ──
async function broadcastSeatUpdate(app, seatIds) {
  const io = app.get('io');
  if (!io) return;
  const ph = seatIds.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await pool.query(
    `SELECT id, event_id, status FROM seats WHERE id IN (${ph})`,
    seatIds
  );
  const byEvent = rows.reduce((acc, s) => {
    (acc[s.event_id] ??= []).push(s);
    return acc;
  }, {});
  for (const [eventId, seats] of Object.entries(byEvent)) {
    io.to(`event:${eventId}`).emit('seats:updated', seats);
  }
}

/**
 * POST /seats/hold
 *
 * SELECT FOR UPDATE NOWAIT  → only one transaction wins per seat row.
 * Loser gets PG error 55P03 → 409 to client immediately.
 * Sets locked_until so the release worker can be safely cancelled on renew.
 */
router.post('/hold', authenticate, async (req, res) => {
  const { seat_ids } = req.body;
  if (!Array.isArray(seat_ids) || seat_ids.length === 0)
    return res.status(400).json({ error: 'seat_ids must be a non-empty array' });
  if (seat_ids.length > 10)
    return res.status(400).json({ error: 'Cannot hold more than 10 seats at once' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ph = seat_ids.map((_, i) => `$${i + 1}`).join(',');
    const { rows: seats } = await client.query(
      `SELECT id, status FROM seats WHERE id IN (${ph}) FOR UPDATE NOWAIT`,
      seat_ids
    );

    if (seats.length !== seat_ids.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'One or more seats not found' });
    }
    const unavailable = seats.filter(s => s.status !== 'available');
    if (unavailable.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Some seats are no longer available',
        seats: unavailable.map(s => s.id),
      });
    }

    const now = new Date();
    const lockedUntil = new Date(now.getTime() + HOLD_MS);
    const uph = seat_ids.map((_, i) => `$${i + 4}`).join(',');
    await client.query(
      `UPDATE seats
       SET status = 'locked', locked_by = $1, locked_at = $2, locked_until = $3
       WHERE id IN (${uph})`,
      [req.user.id, now, lockedUntil, ...seat_ids]
    );

    await client.query('COMMIT');

    // Realtime broadcast (works across instances via Redis adapter)
    await broadcastSeatUpdate(req.app, seat_ids);

    // Schedule auto-release — jobId is deterministic per user so we can cancel it on renew
    // Wrap in try/catch: if Redis is down, the sweepExpiredSeats fallback handles expiry
    try {
      const jobId = `hold-${req.user.id}`;
      const existingJob = await seatReleaseQueue.getJob(jobId);
      if (existingJob) await existingJob.remove().catch(() => {});

      await seatReleaseQueue.add(
        'release',
        { seat_ids, user_id: req.user.id },
        { delay: HOLD_MS, jobId }
      );
    } catch (queueErr) {
      console.warn('Queue unavailable, relying on sweep fallback:', queueErr.message);
    }

    res.json({ ok: true, locked_until: lockedUntil, seat_ids });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '55P03')
      return res.status(409).json({ error: 'Ghế đang được người khác chọn, vui lòng thử lại.' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

/**
 * POST /seats/renew
 *
 * Extends an active hold by HOLD_MINUTES from now.
 * Cancels the old scheduled release job and creates a fresh one.
 * Only works if all seats are still locked by the requesting user.
 * Limited to 1 renewal (enforced client-side; server doesn't restrict).
 */
router.post('/renew', authenticate, async (req, res) => {
  const { seat_ids } = req.body;
  if (!Array.isArray(seat_ids) || seat_ids.length === 0)
    return res.status(400).json({ error: 'seat_ids required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ph = seat_ids.map((_, i) => `$${i + 2}`).join(',');
    const newLockedUntil = new Date(Date.now() + HOLD_MS);

    const { rowCount } = await client.query(
      `UPDATE seats
       SET locked_at = NOW(), locked_until = $1
       WHERE locked_by = $2 AND status = 'locked' AND id IN (${ph})
         AND locked_until > NOW()`,       // only renew seats that haven't expired yet
      [newLockedUntil, req.user.id, ...seat_ids]
    );

    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ghế đã hết hạn giữ, vui lòng chọn lại.' });
    }

    await client.query('COMMIT');

    // Replace the scheduled release job with a fresh one
    try {
      const jobId = `hold-${req.user.id}`;
      const existingJob = await seatReleaseQueue.getJob(jobId);
      if (existingJob) await existingJob.remove().catch(() => {});

      await seatReleaseQueue.add(
        'release',
        { seat_ids, user_id: req.user.id },
        { delay: HOLD_MS, jobId }
      );
    } catch (queueErr) {
      console.warn('Queue unavailable, relying on sweep fallback:', queueErr.message);
    }

    res.json({ ok: true, locked_until: newLockedUntil });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

/**
 * POST /seats/release
 * User manually cancels their hold.
 */
router.post('/release', authenticate, async (req, res) => {
  const { seat_ids } = req.body;
  if (!Array.isArray(seat_ids) || seat_ids.length === 0)
    return res.status(400).json({ error: 'seat_ids required' });
  try {
    const ph = seat_ids.map((_, i) => `$${i + 2}`).join(',');
    await pool.query(
      `UPDATE seats
       SET status = 'available', locked_by = NULL, locked_at = NULL, locked_until = NULL
       WHERE locked_by = $1 AND id IN (${ph}) AND status = 'locked'`,
      [req.user.id, ...seat_ids]
    );
    // Cancel the scheduled release job too
    try {
      const jobId = `hold-${req.user.id}`;
      const job = await seatReleaseQueue.getJob(jobId);
      if (job) await job.remove().catch(() => {});
    } catch (queueErr) {
      console.warn('Queue unavailable on release:', queueErr.message);
    }

    await broadcastSeatUpdate(req.app, seat_ids);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
