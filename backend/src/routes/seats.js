import { Router } from 'express';
import pool from '../config/db.js';
import redis from '../config/redis.js';
import { authenticate } from '../middleware/auth.js';
import { seatReleaseQueue } from '../workers/seatRelease.js';
import { admittedKey, highLoadKey } from '../utils/queueKeys.js';
import { ensureSingleEvent, validateSeatIds } from '../utils/seatHoldRules.js';

const router = Router();

const HOLD_MINUTES = Number(process.env.SEAT_HOLD_MINUTES) || 10;
const HOLD_MS = HOLD_MINUTES * 60 * 1000;

async function safeRedisCall(fn, fallback) {
  if (!redis || !['ready', 'connect'].includes(redis.status)) return fallback;

  try {
    return await Promise.race([
      fn(),
      new Promise(resolve => setTimeout(() => resolve(fallback), 250)),
    ]);
  } catch (err) {
    console.warn('Redis command skipped:', err.message);
    return fallback;
  }
}

async function userNeedsQueueAdmission(eventId, userId) {
  const highLoad = await safeRedisCall(() => redis.get(highLoadKey(eventId)), null);
  if (!highLoad) return false;

  const admitted = await safeRedisCall(() => redis.sismember(admittedKey(eventId), userId), 0);
  return !admitted;
}

async function scheduleSeatRelease(userId, seatIds) {
  const jobId = `hold:${userId}`;
  const existingJob = await seatReleaseQueue.getJob(jobId);
  if (existingJob) await existingJob.remove().catch(() => {});

  await seatReleaseQueue.add(
    'release',
    { seat_ids: seatIds, user_id: userId },
    { delay: HOLD_MS, jobId }
  );
}

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
  const validation = validateSeatIds(seat_ids);
  if (!validation.ok) {
    return res.status(validation.status).json({ error: validation.error });
  }

  const client = await pool.connect();
  let lockedUntil = null;
  let eventId = null;
  try {
    await client.query('BEGIN');

    const ph = seat_ids.map((_, i) => `$${i + 1}`).join(',');
    await client.query(
      `UPDATE seats
       SET status = 'available', locked_by = NULL, locked_at = NULL, locked_until = NULL
       WHERE id IN (${ph})
         AND status = 'locked'
         AND locked_until <= NOW()`,
      seat_ids
    );

    const { rows: seats } = await client.query(
      `SELECT id, event_id, status FROM seats WHERE id IN (${ph}) FOR UPDATE NOWAIT`,
      seat_ids
    );

    if (seats.length !== seat_ids.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'One or more seats not found' });
    }

    const eventCheck = ensureSingleEvent(seats);
    if (!eventCheck.ok) {
      await client.query('ROLLBACK');
      return res.status(eventCheck.status).json({ error: eventCheck.error });
    }
    eventId = eventCheck.eventId;

    if (await userNeedsQueueAdmission(eventId, req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'Bạn cần vào hàng chờ trước khi giữ ghế.',
        code: 'QUEUE_REQUIRED',
        event_id: eventId,
      });
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
    lockedUntil = new Date(now.getTime() + HOLD_MS);
    const uph = seat_ids.map((_, i) => `$${i + 4}`).join(',');
    await client.query(
      `UPDATE seats
       SET status = 'locked', locked_by = $1, locked_at = $2, locked_until = $3
       WHERE id IN (${uph})`,
      [req.user.id, now, lockedUntil, ...seat_ids]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '55P03')
      return res.status(409).json({ error: 'Ghế đang được người khác chọn, vui lòng thử lại.' });
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }

  // Realtime and release queue are best-effort after the DB transaction.
  // The fallback sweeper still releases expired seats if Redis/BullMQ is down.
  await broadcastSeatUpdate(req.app, seat_ids).catch(err => {
    console.warn('Seat broadcast skipped:', err.message);
  });
  await scheduleSeatRelease(req.user.id, seat_ids).catch(err => {
    console.warn('Seat release job scheduling skipped:', err.message);
  });

  res.json({ ok: true, locked_until: lockedUntil, seat_ids, event_id: eventId });
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
    const jobId = `hold:${req.user.id}`;
    const existingJob = await seatReleaseQueue.getJob(jobId);
    if (existingJob) await existingJob.remove().catch(() => {});

    await seatReleaseQueue.add(
      'release',
      { seat_ids, user_id: req.user.id },
      { delay: HOLD_MS, jobId }
    );

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
    const jobId = `hold:${req.user.id}`;
    const job = await seatReleaseQueue.getJob(jobId);
    if (job) await job.remove().catch(() => {});

    await broadcastSeatUpdate(req.app, seat_ids);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
