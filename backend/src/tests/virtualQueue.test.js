import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUEUE_BATCH_SIZE,
  MAX_QUEUE_BATCH_SIZE,
  extractQueueUserIds,
  normalizeQueueBatchSize,
  userHasQueueAccess,
} from '../utils/virtualQueueRules.js';

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
    expect(normalizeQueueBatchSize(0)).toBe(DEFAULT_QUEUE_BATCH_SIZE);
    expect(normalizeQueueBatchSize(MAX_QUEUE_BATCH_SIZE + 1)).toBe(MAX_QUEUE_BATCH_SIZE);
  });

  it('extracts admitted user ids from Redis zpopmin results', () => {
    expect(extractQueueUserIds(['user-1', '100', 'user-2', '101'])).toEqual(['user-1', 'user-2']);
    expect(extractQueueUserIds(null)).toEqual([]);
  });
});
