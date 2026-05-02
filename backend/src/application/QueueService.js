import { redisClient } from '../infrastructure/cache/RedisClient.js';
import { QUEUE_BATCH_SIZE } from '../domain/constants.js';

const queueKey    = (eid) => `queue:${eid}`;
const admittedKey = (eid) => `admitted:${eid}`;
const highLoadKey = (eid) => `highload:${eid}`;

export class QueueService {
  constructor(io) { this.io = io; }

  async enter(eventId, userId) {
    const highLoad = await redisClient.get(highLoadKey(eventId));
    if (!highLoad) return { admitted: true, position: 0 };
    const admitted = await redisClient.sismember(admittedKey(eventId), userId);
    if (admitted) return { admitted: true, position: 0 };
    await redisClient.zadd(queueKey(eventId), 'NX', Date.now(), userId);
    const position = await redisClient.zrank(queueKey(eventId), userId);
    return { admitted: false, position: position + 1 };
  }

  async getStatus(eventId, userId) {
    const admitted = await redisClient.sismember(admittedKey(eventId), userId);
    if (admitted) return { admitted: true, position: 0 };
    const highLoad = await redisClient.get(highLoadKey(eventId));
    if (!highLoad) return { admitted: true, position: 0 };
    const rank  = await redisClient.zrank(queueKey(eventId), userId);
    if (rank === null) return { admitted: true, position: 0 };
    const total = await redisClient.zcard(queueKey(eventId));
    return { admitted: false, position: rank + 1, total };
  }

  async enable(eventId) {
    await redisClient.set(highLoadKey(eventId), '1');
  }

  async disable(eventId) {
    await redisClient.del(highLoadKey(eventId), queueKey(eventId), admittedKey(eventId));
  }

  async admitBatch(eventId, batchSize = QUEUE_BATCH_SIZE) {
    const members = await redisClient.zpopmin(queueKey(eventId), batchSize);
    const userIds = members.filter((_, i) => i % 2 === 0);
    if (userIds.length > 0) {
      await redisClient.sadd(admittedKey(eventId), ...userIds);
      await redisClient.expire(admittedKey(eventId), 15 * 60);
      if (this.io) {
        userIds.forEach(uid => this.io.to(`user:${uid}`).emit('queue:admitted', { eventId }));
      }
    }
    return { admitted: userIds.length, remaining: await redisClient.zcard(queueKey(eventId)) };
  }
}
