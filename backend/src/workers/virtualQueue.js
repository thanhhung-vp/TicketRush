import pool from '../config/db.js';
import redis from '../config/redis.js';
import { queueAdmissionLockKey, queueKey } from '../utils/queueKeys.js';
import {
  addUsersToQueueAdmissions,
  getActiveQueueAdmissionCount,
  isRedisReady,
} from '../utils/virtualQueueAccess.js';
import {
  extractQueueUserIds,
  getAvailableAdmissionSlots,
  normalizeQueueBatchSize,
} from '../utils/virtualQueueRules.js';

const DEFAULT_ADMIT_INTERVAL_MS = 30_000;
const DEFAULT_ACCESS_SECONDS = 15 * 60;

let virtualQueueTimer = null;

async function withAdmissionLock(redisClient, eventId, work) {
  const lockKey = queueAdmissionLockKey(eventId);
  const lockValue = `${process.pid}:${Date.now()}:${Math.random()}`;
  const acquired = await redisClient.set(lockKey, lockValue, 'PX', 5000, 'NX');

  if (acquired !== 'OK') {
    return { admitted: 0, user_ids: [], locked: true };
  }

  try {
    return await work();
  } finally {
    const currentLock = await redisClient.get(lockKey);
    if (currentLock === lockValue) await redisClient.del(lockKey);
  }
}

export async function admitQueueBatch({
  eventId,
  batchSize,
  io,
  redisClient = redis,
  accessSeconds = DEFAULT_ACCESS_SECONDS,
  now = Date.now(),
}) {
  if (!isRedisReady(redisClient)) return { admitted: 0, user_ids: [] };

  return withAdmissionLock(redisClient, eventId, async () => {
    const activeCount = await getActiveQueueAdmissionCount(redisClient, eventId, now);
    const slots = getAvailableAdmissionSlots({
      capacity: normalizeQueueBatchSize(batchSize),
      admittedCount: activeCount,
    });

    if (slots <= 0) {
      return {
        admitted: 0,
        user_ids: [],
        active_count: activeCount,
        remaining: await redisClient.zcard(queueKey(eventId)),
      };
    }

    const members = await redisClient.zpopmin(queueKey(eventId), slots);
    const userIds = extractQueueUserIds(members);

    if (userIds.length === 0) {
      return { admitted: 0, user_ids: [], active_count: activeCount, remaining: 0 };
    }

    await addUsersToQueueAdmissions(redisClient, eventId, userIds, { accessSeconds, now });

    if (io) {
      userIds.forEach(userId => {
        io.to(`user:${userId}`).emit('queue:admitted', { eventId });
      });
    }

    return {
      admitted: userIds.length,
      user_ids: userIds,
      active_count: activeCount + userIds.length,
      remaining: await redisClient.zcard(queueKey(eventId)),
    };
  });
}

export async function processVirtualQueueTick({ db = pool, redisClient = redis, io } = {}) {
  if (!isRedisReady(redisClient)) return [];

  const { rows: events } = await db.query(
    `SELECT id, queue_batch_size
     FROM events
     WHERE queue_enabled = TRUE`
  );

  return Promise.all(events.map(event => admitQueueBatch({
    eventId: event.id,
    batchSize: event.queue_batch_size,
    io,
    redisClient,
  })));
}

export function startVirtualQueueWorker(io, options = {}) {
  if (virtualQueueTimer) return virtualQueueTimer;

  const intervalMs = Number(options.intervalMs || process.env.QUEUE_ADMIT_INTERVAL_MS)
    || DEFAULT_ADMIT_INTERVAL_MS;

  virtualQueueTimer = setInterval(() => {
    processVirtualQueueTick({ io }).catch(err => {
      console.error('[virtual queue worker]', err.message);
    });
  }, intervalMs);
  virtualQueueTimer.unref?.();

  return virtualQueueTimer;
}

export function stopVirtualQueueWorker() {
  if (!virtualQueueTimer) return;
  clearInterval(virtualQueueTimer);
  virtualQueueTimer = null;
}
