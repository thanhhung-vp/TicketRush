import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampPage,
  getCompactPaginationItems,
  getPageItems,
  getTotalPages,
  splitEventsBySchedule,
} from '../src/utils/homeSections.js';

const now = new Date('2026-05-15T12:00:00.000Z');

test('splits events into upcoming and past groups without mutating input', () => {
  const events = [
    { id: 'past-by-date', event_date: '2026-05-14T12:00:00.000Z', status: 'on_sale' },
    { id: 'future', event_date: '2026-05-16T12:00:00.000Z', status: 'on_sale' },
    { id: 'ended-future', event_date: '2026-05-18T12:00:00.000Z', status: 'ended' },
    { id: 'invalid-date', event_date: 'not-a-date', status: 'on_sale' },
  ];

  const result = splitEventsBySchedule(events, now);

  assert.deepEqual(result.upcoming.map(event => event.id), ['future', 'invalid-date']);
  assert.deepEqual(result.past.map(event => event.id), ['past-by-date', 'ended-future']);
  assert.deepEqual(events.map(event => event.id), ['past-by-date', 'future', 'ended-future', 'invalid-date']);
});

test('paginates numbered event sections', () => {
  const items = Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }));

  assert.equal(getTotalPages(items, 4), 3);
  assert.deepEqual(getPageItems(items, 2, 4).map(item => item.id), [5, 6, 7, 8]);
  assert.deepEqual(getPageItems(items, 3, 4).map(item => item.id), [9, 10]);
});

test('clamps requested page to available range', () => {
  assert.equal(clampPage(0, 4), 1);
  assert.equal(clampPage(7, 4), 4);
  assert.equal(clampPage(2, 4), 2);
  assert.equal(clampPage(2, 0), 1);
});

test('builds compact pagination items for large page counts', () => {
  assert.deepEqual(getCompactPaginationItems(14, 1), [1, 2, 3, 'ellipsis', 14]);
  assert.deepEqual(getCompactPaginationItems(14, 7), [1, 'ellipsis', 6, 7, 8, 'ellipsis', 14]);
  assert.deepEqual(getCompactPaginationItems(14, 14), [1, 'ellipsis', 12, 13, 14]);
  assert.deepEqual(getCompactPaginationItems(5, 3), [1, 2, 3, 4, 5]);
});
