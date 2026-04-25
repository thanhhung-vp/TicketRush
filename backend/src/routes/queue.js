import { Router } from 'express';
import redis from '../config/redis.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const BATCH_SIZE     = 50;   // users per batch admitted
const ADMIT_INTERVAL = 30;   // seconds between admitting batches

function queueKey(eventId)   { return `queue:${eventId}`; }
function admittedKey(eventId){ return `admitted:${eventId}`; }
function highLoadKey(eventId){ return `highload:${eventId}`; }

/**
 * POST /queue/:eventId/enter
 * Khán giả gọi khi muốn vào trang chọn ghế.
 * - Nếu hệ thống không quá tải → trả về admitted = true ngay.
 * - Nếu quá tải (admin đã bật queue) → đẩy vào danh sách chờ, trả về vị trí.
 */
router.post('/:eventId/enter', authenticate, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;
  const highLoad = await redis.get(highLoadKey(eventId));

  if (!highLoad) {
    return res.json({ admitted: true, position: 0 });
  }

  // Check if already admitted
  const admitted = await redis.sismember(admittedKey(eventId), userId);
  if (admitted) return res.json({ admitted: true, position: 0 });

  // Add to queue (ZADD NX: only if not already in queue)
  const score = Date.now();
  await redis.zadd(queueKey(eventId), 'NX', score, userId);

  const position = await redis.zrank(queueKey(eventId), userId);
  res.json({ admitted: false, position: position + 1 });
});

/**
 * GET /queue/:eventId/status
 * Polling: khán giả hỏi trạng thái của mình trong hàng chờ.
 */
router.get('/:eventId/status', authenticate, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  const admitted = await redis.sismember(admittedKey(eventId), userId);
  if (admitted) return res.json({ admitted: true, position: 0 });

  const highLoad = await redis.get(highLoadKey(eventId));
  if (!highLoad) return res.json({ admitted: true, position: 0 });

  const rank = await redis.zrank(queueKey(eventId), userId);
  if (rank === null) return res.json({ admitted: true, position: 0 }); // not in queue = free

  const total = await redis.zcard(queueKey(eventId));
  res.json({ admitted: false, position: rank + 1, total });
});

// ── Admin controls ────────────────────────────────────────

/**
 * POST /queue/:eventId/enable  — Admin bật chế độ queue cho sự kiện
 */
router.post('/:eventId/enable', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  await redis.set(highLoadKey(req.params.eventId), '1');
  res.json({ ok: true, message: 'Virtual queue enabled' });
});

/**
 * POST /queue/:eventId/disable — Admin tắt queue
 */
router.post('/:eventId/disable', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { eventId } = req.params;
  await redis.del(highLoadKey(eventId), queueKey(eventId), admittedKey(eventId));
  res.json({ ok: true, message: 'Virtual queue disabled' });
});

/**
 * POST /queue/:eventId/admit  — Tiến hành cho vào một batch (50 người)
 * Gọi bởi cron job hoặc admin thủ công.
 */
router.post('/:eventId/admit', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { eventId } = req.params;
  const batch = req.body.batch_size || BATCH_SIZE;

  // Pop batch_size oldest entries from sorted set
  const members = await redis.zpopmin(queueKey(eventId), batch);
  // members = [userId, score, userId, score, ...]
  const userIds = members.filter((_, i) => i % 2 === 0);

  if (userIds.length > 0) {
    await redis.sadd(admittedKey(eventId), ...userIds);
    // Set 15min expiry on admitted set (cleanup)
    await redis.expire(admittedKey(eventId), 15 * 60);

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) {
      userIds.forEach(uid => {
        io.to(`user:${uid}`).emit('queue:admitted', { eventId });
      });
    }
  }

  res.json({ admitted: userIds.length, remaining: await redis.zcard(queueKey(eventId)) });
});

export default router;
