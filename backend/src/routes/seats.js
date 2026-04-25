import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { seatReleaseQueue } from '../workers/seatRelease.js';

const router = Router();

const HOLD_MINUTES = Number(process.env.SEAT_HOLD_MINUTES) || 10;

/**
 * POST /seats/hold
 * Body: { seat_ids: string[] }
 *
 * Dùng SELECT FOR UPDATE NOWAIT để lock các hàng ghế.
 * Nếu 2 user cùng click cùng lúc, chỉ 1 transaction thắng.
 * Transaction kia nhận lỗi 409.
 */
router.post('/hold', authenticate, async (req, res) => {
  const { seat_ids } = req.body;
  if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
    return res.status(400).json({ error: 'seat_ids must be a non-empty array' });
  }
  if (seat_ids.length > 10) {
    return res.status(400).json({ error: 'Cannot hold more than 10 seats at once' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock rows — NOWAIT throws immediately if another transaction holds the lock
    const placeholders = seat_ids.map((_, i) => `$${i + 1}`).join(',');
    const { rows: seats } = await client.query(
      `SELECT id, status FROM seats
       WHERE id IN (${placeholders})
       FOR UPDATE NOWAIT`,
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

    const lockedAt = new Date();
    await client.query(
      `UPDATE seats
       SET status = 'locked', locked_by = $1, locked_at = $2
       WHERE id IN (${placeholders})`,
      [req.user.id, lockedAt, ...seat_ids]
    );

    await client.query('COMMIT');

    // Broadcast to event room that these seats are now locked
    const io = req.app.get('io');
    if (io) {
      const { rows: updatedSeats } = await pool.query(
        `SELECT id, event_id, status FROM seats WHERE id IN (${placeholders})`,
        seat_ids
      );
      const eventId = updatedSeats[0]?.event_id;
      if (eventId) {
        io.to(`event:${eventId}`).emit('seats:updated', updatedSeats);
      }
    }

    // Schedule auto-release jobs
    const releaseAt = new Date(lockedAt.getTime() + HOLD_MINUTES * 60 * 1000);
    await seatReleaseQueue.add(
      'release',
      { seat_ids, user_id: req.user.id },
      { delay: HOLD_MINUTES * 60 * 1000, jobId: `hold-${req.user.id}-${Date.now()}` }
    );

    res.json({ ok: true, locked_until: releaseAt, seat_ids });
  } catch (err) {
    await client.query('ROLLBACK');
    // 55P03 = lock_not_available (NOWAIT)
    if (err.code === '55P03') {
      return res.status(409).json({ error: 'Seat is being grabbed by another user, please try again' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

/**
 * POST /seats/release
 * Body: { seat_ids: string[] }
 * Khán giả chủ động hủy giữ chỗ.
 */
router.post('/release', authenticate, async (req, res) => {
  const { seat_ids } = req.body;
  if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
    return res.status(400).json({ error: 'seat_ids required' });
  }
  try {
    const placeholders = seat_ids.map((_, i) => `$${i + 2}`).join(',');
    await pool.query(
      `UPDATE seats
       SET status = 'available', locked_by = NULL, locked_at = NULL
       WHERE locked_by = $1 AND id IN (${placeholders}) AND status = 'locked'`,
      [req.user.id, ...seat_ids]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
