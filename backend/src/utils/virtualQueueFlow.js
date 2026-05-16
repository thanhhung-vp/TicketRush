import pool from '../config/db.js';
import redis from '../config/redis.js';
import { admitQueueBatch } from '../workers/virtualQueue.js';
import { releaseQueueAdmission } from './virtualQueueAccess.js';

export async function releaseQueueSlotAndFill({
  eventId,
  userId,
  io,
  db = pool,
  redisClient = redis,
}) {
  const released = await releaseQueueAdmission(redisClient, eventId, userId);
  if (released <= 0) return { released, admitted: 0 };

  const { rows } = await db.query(
    `SELECT queue_enabled, queue_batch_size
     FROM events
     WHERE id = $1`,
    [eventId]
  );
  const event = rows[0];
  if (!event?.queue_enabled) return { released, admitted: 0 };

  const result = await admitQueueBatch({
    eventId,
    batchSize: event.queue_batch_size,
    io,
    redisClient,
  });

  return { released, ...result };
}
