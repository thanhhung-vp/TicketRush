import { redisClient } from '../infrastructure/cache/RedisClient.js';
import { QUEUE_BATCH_SIZE } from '../domain/constants.js';
import { admitQueueBatch } from '../workers/virtualQueue.js';
import { admittedKey, highLoadKey, queueAdmissionLockKey, queueKey } from '../utils/queueKeys.js';
import { isUserAdmittedToQueue } from '../utils/virtualQueueAccess.js';

export class QueueService {
  constructor(io) { this.io = io; }

  async enter(eventId, userId) {
    const highLoad = await redisClient.get(highLoadKey(eventId));
    if (!highLoad) return { admitted: true, position: 0 };
    const admitted = await isUserAdmittedToQueue(redisClient, eventId, userId);
    if (admitted) return { admitted: true, position: 0 };

    await redisClient.zadd(queueKey(eventId), 'NX', Date.now(), userId);
    await this.admitBatch(eventId);
    if (await isUserAdmittedToQueue(redisClient, eventId, userId)) {
      return { admitted: true, position: 0 };
    }

    const position = await redisClient.zrank(queueKey(eventId), userId);
    return { admitted: false, position: position + 1 };
  }

  async getStatus(eventId, userId) {
    const admitted = await isUserAdmittedToQueue(redisClient, eventId, userId);
    if (admitted) return { admitted: true, position: 0 };
    const highLoad = await redisClient.get(highLoadKey(eventId));
    if (!highLoad) return { admitted: true, position: 0 };
    const rank  = await redisClient.zrank(queueKey(eventId), userId);
    if (rank === null) await redisClient.zadd(queueKey(eventId), 'NX', Date.now(), userId);
    await this.admitBatch(eventId);
    if (await isUserAdmittedToQueue(redisClient, eventId, userId)) {
      return { admitted: true, position: 0 };
    }
    const total = await redisClient.zcard(queueKey(eventId));
    const nextRank = await redisClient.zrank(queueKey(eventId), userId);
    return { admitted: false, position: nextRank === null ? null : nextRank + 1, total };
  }

  async enable(eventId) {
    await redisClient.set(highLoadKey(eventId), '1');
  }

  async disable(eventId) {
    await redisClient.del(highLoadKey(eventId), queueKey(eventId), admittedKey(eventId), queueAdmissionLockKey(eventId));
  }

  async admitBatch(eventId, batchSize = QUEUE_BATCH_SIZE) {
    return admitQueueBatch({
      eventId,
      batchSize,
      io: this.io,
      redisClient,
    });
  }
}
