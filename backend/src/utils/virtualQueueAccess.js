import { admittedKey } from './queueKeys.js';

const REDIS_READY_STATUSES = new Set(['ready', 'connect']);

export function isRedisReady(redisClient) {
  return Boolean(redisClient && REDIS_READY_STATUSES.has(redisClient.status));
}

function isWrongTypeError(err) {
  return String(err?.message || '').includes('WRONGTYPE');
}

async function withAdmissionKeyRecovery(redisClient, eventId, action) {
  try {
    return await action();
  } catch (err) {
    if (!isWrongTypeError(err)) throw err;
    await redisClient.del(admittedKey(eventId));
    return action();
  }
}

export async function removeExpiredQueueAdmissions(redisClient, eventId, now = Date.now()) {
  if (!isRedisReady(redisClient)) return 0;
  return withAdmissionKeyRecovery(redisClient, eventId, () => (
    redisClient.zremrangebyscore(admittedKey(eventId), '-inf', now)
  ));
}

export async function getActiveQueueAdmissionCount(redisClient, eventId, now = Date.now()) {
  if (!isRedisReady(redisClient)) return 0;
  await removeExpiredQueueAdmissions(redisClient, eventId, now);
  return withAdmissionKeyRecovery(redisClient, eventId, () => redisClient.zcard(admittedKey(eventId)));
}

export async function isUserAdmittedToQueue(redisClient, eventId, userId, now = Date.now()) {
  if (!isRedisReady(redisClient)) return false;
  await removeExpiredQueueAdmissions(redisClient, eventId, now);
  const expiresAt = await withAdmissionKeyRecovery(redisClient, eventId, () => (
    redisClient.zscore(admittedKey(eventId), userId)
  ));
  return Number(expiresAt || 0) > now;
}

export async function addUsersToQueueAdmissions(
  redisClient,
  eventId,
  userIds,
  { accessSeconds, now = Date.now() }
) {
  if (!isRedisReady(redisClient) || userIds.length === 0) return null;

  const expiresAt = now + accessSeconds * 1000;
  const entries = userIds.flatMap(userId => [expiresAt, userId]);

  await withAdmissionKeyRecovery(redisClient, eventId, () => (
    redisClient.zadd(admittedKey(eventId), ...entries)
  ));
  await redisClient.expire(admittedKey(eventId), accessSeconds + 60);

  return expiresAt;
}

export async function releaseQueueAdmission(redisClient, eventId, userId) {
  if (!isRedisReady(redisClient) || !userId) return 0;
  return withAdmissionKeyRecovery(redisClient, eventId, () => (
    redisClient.zrem(admittedKey(eventId), userId)
  ));
}
