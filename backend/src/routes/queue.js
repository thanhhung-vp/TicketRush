import { Router } from 'express';
import pool from '../config/db.js';
import redis from '../config/redis.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { admittedKey, highLoadKey, queueKey } from '../utils/queueKeys.js';
import { normalizeQueueBatchSize, userHasQueueAccess } from '../utils/virtualQueueRules.js';
import { admitQueueBatch } from '../workers/virtualQueue.js';

const router = Router();

async function getQueueEvent(eventId) {
  const { rows } = await pool.query(
    `SELECT id, queue_enabled, queue_batch_size
     FROM events
     WHERE id = $1`,
    [eventId]
  );
  return rows[0] || null;
}

async function getQueueSnapshot(eventId) {
  const [waitingCount, admittedCount] = await Promise.all([
    redis.zcard(queueKey(eventId)),
    redis.scard(admittedKey(eventId)),
  ]);
  return { waiting_count: waitingCount, admitted_count: admittedCount };
}

router.post('/:eventId/enter', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getQueueEvent(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (!event.queue_enabled || req.user.role === 'admin') {
      return res.json({ admitted: true, position: 0, total: 0 });
    }

    const admitted = await redis.sismember(admittedKey(eventId), req.user.id);
    if (userHasQueueAccess({ queueEnabled: event.queue_enabled, admitted, isAdmin: false })) {
      return res.json({ admitted: true, position: 0, total: await redis.zcard(queueKey(eventId)) });
    }

    await redis.zadd(queueKey(eventId), 'NX', Date.now(), req.user.id);
    const rank = await redis.zrank(queueKey(eventId), req.user.id);
    const total = await redis.zcard(queueKey(eventId));

    res.json({
      admitted: false,
      position: rank === null ? null : rank + 1,
      total,
      batch_size: event.queue_batch_size,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:eventId/status', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getQueueEvent(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (!event.queue_enabled || req.user.role === 'admin') {
      return res.json({ admitted: true, position: 0, total: 0 });
    }

    const admitted = await redis.sismember(admittedKey(eventId), req.user.id);
    if (admitted) return res.json({ admitted: true, position: 0, total: await redis.zcard(queueKey(eventId)) });

    let rank = await redis.zrank(queueKey(eventId), req.user.id);

    // User lost their spot (Redis restart or race condition) — re-add to end of queue
    if (rank === null) {
      await redis.zadd(queueKey(eventId), 'NX', Date.now(), req.user.id);
      rank = await redis.zrank(queueKey(eventId), req.user.id);
    }

    const total = await redis.zcard(queueKey(eventId));
    res.json({
      admitted: false,
      position: rank === null ? 1 : rank + 1,
      total,
      batch_size: event.queue_batch_size,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:eventId/admin-status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getQueueEvent(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    res.json({
      queue_enabled: event.queue_enabled,
      queue_batch_size: event.queue_batch_size,
      ...(await getQueueSnapshot(eventId)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:eventId/enable', authenticate, requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const batchSize = normalizeQueueBatchSize(req.body?.batch_size);
    const { rows } = await pool.query(
      `UPDATE events
       SET queue_enabled = TRUE, queue_batch_size = $2
       WHERE id = $1
       RETURNING id, queue_enabled, queue_batch_size`,
      [eventId, batchSize]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Event not found' });

    await redis.set(highLoadKey(eventId), '1');
    res.json({ ok: true, ...rows[0], ...(await getQueueSnapshot(eventId)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:eventId/disable', authenticate, requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rows } = await pool.query(
      `UPDATE events
       SET queue_enabled = FALSE
       WHERE id = $1
       RETURNING id, queue_enabled, queue_batch_size`,
      [eventId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Event not found' });

    await redis.del(highLoadKey(eventId), queueKey(eventId), admittedKey(eventId));
    res.json({ ok: true, ...rows[0], waiting_count: 0, admitted_count: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:eventId/admit', authenticate, requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getQueueEvent(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const batchSize = normalizeQueueBatchSize(req.body?.batch_size, event.queue_batch_size);
    const result = await admitQueueBatch({
      eventId,
      batchSize,
      io: req.app.get('io'),
    });

    res.json({
      admitted: result.admitted,
      ...(await getQueueSnapshot(eventId)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
