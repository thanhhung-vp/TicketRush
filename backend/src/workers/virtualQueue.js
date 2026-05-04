import pool from '../config/db.js';
import redis from '../config/redis.js';
import { admittedKey, queueKey } from '../utils/queueKeys.js';
import { extractQueueUserIds, normalizeQueueBatchSize } from '../utils/virtualQueueRules.js';

const DEFAULT_ADMIT_INTERVAL_MS = 30_000;
const DEFAULT_ACCESS_SECONDS = 15 * 60;

let virtualQueueTimer = null;

function isRedisReady(redisClient) {
  return Boolean(redisClient && ['ready', 'connect'].includes(redisClient.status));
}

export async function admitQueueBatch({
  eventId,
  batchSize,
  io,
  redisClient = redis,
  accessSeconds = DEFAULT_ACCESS_SECONDS,
}) {
  if (!isRedisReady(redisClient)) return { admitted: 0, user_ids: [] };

  const members = await redisClient.zpopmin(queueKey(eventId), normalizeQueueBatchSize(batchSize));
  const userIds = extractQueueUserIds(members);

  if (userIds.length === 0) return { admitted: 0, user_ids: [] };

  await redisClient.sadd(admittedKey(eventId), ...userIds);
  // Use EXPIREGT so we only extend (never shorten) the TTL of the admitted set.
  // This prevents resetting the 15-min window for users already inside.
  const setTtl = await redisClient.ttl(admittedKey(eventId));
  if (setTtl < accessSeconds) {
    await redisClient.expire(admittedKey(eventId), accessSeconds);
  }

  if (io) {
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit('queue:admitted', { eventId });
    });
  }

  return { admitted: userIds.length, user_ids: userIds };
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
