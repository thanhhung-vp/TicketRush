import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequestCache } from '../src/utils/prefetchCache.js';

test('reuses pending fetches for the same key', async () => {
  const cache = createRequestCache();
  let calls = 0;

  const first = cache.fetch('event-1', async () => {
    calls += 1;
    return { id: 'event-1', title: 'Full event' };
  });
  const second = cache.fetch('event-1', async () => {
    calls += 1;
    return { id: 'event-1', title: 'Duplicate request' };
  });

  assert.equal(first, second);
  assert.deepEqual(await first, { id: 'event-1', title: 'Full event' });
  assert.equal(calls, 1);
});

test('fetches full data when only a partial seed is cached', async () => {
  const cache = createRequestCache();

  cache.set('event-1', { id: 'event-1', title: 'From home' }, { partial: true });

  const data = await cache.fetch('event-1', async () => ({
    id: 'event-1',
    title: 'Full detail',
    zones: [],
  }));

  assert.deepEqual(data, { id: 'event-1', title: 'Full detail', zones: [] });
  assert.equal(cache.isPartial('event-1'), false);
});

test('expires cached data after ttl', () => {
  let clock = 1_000;
  const cache = createRequestCache({ ttlMs: 500, now: () => clock });

  cache.set('admin', { ready: true });
  assert.deepEqual(cache.get('admin'), { ready: true });

  clock = 1_501;
  assert.equal(cache.get('admin'), null);
});
