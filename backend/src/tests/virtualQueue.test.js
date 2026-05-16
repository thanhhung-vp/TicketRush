import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/redis.js', () => ({ default: null }));
vi.mock('../config/db.js', () => ({ default: { query: vi.fn() } }));

import {
  DEFAULT_QUEUE_BATCH_SIZE,
  MAX_QUEUE_BATCH_SIZE,
  extractQueueUserIds,
  getAvailableAdmissionSlots,
  normalizeQueueBatchSize,
  userHasQueueAccess,
} from '../utils/virtualQueueRules.js';
import { releaseQueueAdmission } from '../utils/virtualQueueAccess.js';
import { admittedKey, queueKey } from '../utils/queueKeys.js';
import { admitQueueBatch } from '../workers/virtualQueue.js';
import { createVirtualQueuePresence } from '../utils/virtualQueuePresence.js';

function createFakeRedis({ queued = [], admitted = [] } = {}) {
  const sortedSets = new Map();

  const setMembers = (key, members) => {
    sortedSets.set(key, new Map(members.map(({ id, score }) => [id, Number(score)])));
  };

  setMembers(queueKey('event-1'), queued);
  setMembers(admittedKey('event-1'), admitted);

  const getSet = (key) => {
    if (!sortedSets.has(key)) sortedSets.set(key, new Map());
    return sortedSets.get(key);
  };

  return {
    status: 'ready',
    zremrangebyscore: vi.fn(async (key, min, max) => {
      const set = getSet(key);
      const upper = Number(max);
      let removed = 0;
      for (const [member, score] of set.entries()) {
        if (score <= upper) {
          set.delete(member);
          removed += 1;
        }
      }
      return removed;
    }),
    zcard: vi.fn(async (key) => getSet(key).size),
    zpopmin: vi.fn(async (key, count) => {
      const set = getSet(key);
      const members = [...set.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, count);
      members.forEach(([member]) => set.delete(member));
      return members.flatMap(([member, score]) => [member, String(score)]);
    }),
    zadd: vi.fn(async (key, ...args) => {
      const set = getSet(key);
      for (let i = 0; i < args.length; i += 2) {
        set.set(args[i + 1], Number(args[i]));
      }
      return args.length / 2;
    }),
    zrem: vi.fn(async (key, ...members) => {
      const set = getSet(key);
      let removed = 0;
      members.forEach(member => {
        if (set.delete(member)) removed += 1;
      });
      return removed;
    }),
    expire: vi.fn(async () => 1),
    set: vi.fn(async () => 'OK'),
    get: vi.fn(async () => null),
    del: vi.fn(async () => 1),
  };
}

describe('virtual queue rules', () => {
  it('allows access when queue is disabled', () => {
    expect(userHasQueueAccess({ queueEnabled: false, admitted: false, isAdmin: false })).toBe(true);
  });

  it('requires admission when queue is enabled for a customer', () => {
    expect(userHasQueueAccess({ queueEnabled: true, admitted: false, isAdmin: false })).toBe(false);
    expect(userHasQueueAccess({ queueEnabled: true, admitted: true, isAdmin: false })).toBe(true);
  });

  it('lets admins bypass the customer waiting room', () => {
    expect(userHasQueueAccess({ queueEnabled: true, admitted: false, isAdmin: true })).toBe(true);
  });

  it('normalizes batch size with bounded defaults', () => {
    expect(normalizeQueueBatchSize(undefined)).toBe(DEFAULT_QUEUE_BATCH_SIZE);
    expect(normalizeQueueBatchSize('25')).toBe(25);
    expect(normalizeQueueBatchSize(0)).toBe(0);
    expect(normalizeQueueBatchSize(undefined, 0)).toBe(0);
    expect(normalizeQueueBatchSize(MAX_QUEUE_BATCH_SIZE + 1)).toBe(MAX_QUEUE_BATCH_SIZE);
  });

  it('calculates available admission slots without exceeding queue capacity', () => {
    expect(getAvailableAdmissionSlots({ capacity: 0, admittedCount: 0 })).toBe(0);
    expect(getAvailableAdmissionSlots({ capacity: 50, admittedCount: 45 })).toBe(5);
    expect(getAvailableAdmissionSlots({ capacity: 50, admittedCount: 50 })).toBe(0);
    expect(getAvailableAdmissionSlots({ capacity: 50, admittedCount: 75 })).toBe(0);
  });

  it('extracts admitted user ids from Redis zpopmin results', () => {
    expect(extractQueueUserIds(['user-1', '100', 'user-2', '101'])).toEqual(['user-1', 'user-2']);
    expect(extractQueueUserIds(null)).toEqual([]);
  });
});

describe('virtual queue admission worker', () => {
  it('does not admit anyone when event queue capacity is zero', async () => {
    const redis = createFakeRedis({
      queued: [{ id: 'user-1', score: 1 }],
    });

    const result = await admitQueueBatch({
      eventId: 'event-1',
      batchSize: 0,
      redisClient: redis,
      now: 1_000,
    });

    expect(result.admitted).toBe(0);
    expect(await redis.zcard(admittedKey('event-1'))).toBe(0);
    expect(await redis.zcard(queueKey('event-1'))).toBe(1);
  });

  it('only admits users into currently available capacity slots', async () => {
    const redis = createFakeRedis({
      admitted: [
        { id: 'active-1', score: 1_000_000 },
        { id: 'active-2', score: 1_000_000 },
      ],
      queued: [
        { id: 'user-1', score: 1 },
        { id: 'user-2', score: 2 },
        { id: 'user-3', score: 3 },
      ],
    });

    const result = await admitQueueBatch({
      eventId: 'event-1',
      batchSize: 4,
      redisClient: redis,
      now: 1_000,
    });

    expect(result.user_ids).toEqual(['user-1', 'user-2']);
    expect(await redis.zcard(admittedKey('event-1'))).toBe(4);
    expect(await redis.zcard(queueKey('event-1'))).toBe(1);
  });

  it('fills the next waiting user after a completed buyer releases their slot', async () => {
    const redis = createFakeRedis({
      admitted: [{ id: 'buyer-1', score: 1_000_000 }],
      queued: [{ id: 'user-1', score: 1 }],
    });

    const released = await releaseQueueAdmission(redis, 'event-1', 'buyer-1');
    const result = await admitQueueBatch({
      eventId: 'event-1',
      batchSize: 1,
      redisClient: redis,
      now: 1_000,
    });

    expect(released).toBe(1);
    expect(result.user_ids).toEqual(['user-1']);
    expect(await redis.zcard(admittedKey('event-1'))).toBe(1);
    expect(await redis.zcard(queueKey('event-1'))).toBe(0);
  });
});

describe('virtual queue booking page presence', () => {
  it('releases an admitted page slot and fills the next waiting user after leave grace', async () => {
    vi.useFakeTimers();
    const releaseSlotAndFill = vi.fn(async () => ({ released: 1, admitted: 1, user_ids: ['user-2'] }));
    const presence = createVirtualQueuePresence({
      io: { to: vi.fn() },
      releaseSlotAndFill,
      graceMs: 100,
      logger: { warn: vi.fn() },
    });

    presence.join('event-1', 'user-1');
    presence.leave('event-1', 'user-1');

    expect(releaseSlotAndFill).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);

    expect(releaseSlotAndFill).toHaveBeenCalledWith({
      eventId: 'event-1',
      userId: 'user-1',
      io: expect.any(Object),
    });
    vi.useRealTimers();
  });

  it('keeps the admitted slot when the user rejoins before leave grace expires', async () => {
    vi.useFakeTimers();
    const releaseSlotAndFill = vi.fn(async () => ({ released: 1, admitted: 1 }));
    const presence = createVirtualQueuePresence({
      releaseSlotAndFill,
      graceMs: 100,
      logger: { warn: vi.fn() },
    });

    presence.join('event-1', 'user-1');
    presence.leave('event-1', 'user-1');
    await vi.advanceTimersByTimeAsync(50);
    presence.join('event-1', 'user-1');
    await vi.advanceTimersByTimeAsync(100);

    expect(releaseSlotAndFill).not.toHaveBeenCalled();
    expect(presence.getActiveCount('event-1', 'user-1')).toBe(1);
    vi.useRealTimers();
  });
});
