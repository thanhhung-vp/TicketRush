import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoutePreloader, getRouteLoaderKey } from '../src/utils/routePreload.js';

test('matches static and dynamic app routes to preload keys', () => {
  assert.equal(getRouteLoaderKey('/'), 'home');
  assert.equal(getRouteLoaderKey('/events/event-1'), 'eventDetail');
  assert.equal(getRouteLoaderKey('/orders/order-1/tickets'), 'tickets');
  assert.equal(getRouteLoaderKey('/admin/events/event-1/checkin'), 'adminCheckin');
  assert.equal(getRouteLoaderKey('/admin/events/new'), 'adminEvent');
  assert.equal(getRouteLoaderKey('/unknown'), null);
});

test('preloads a route chunk once and reuses the pending import', () => {
  let calls = 0;
  const preloadRoute = createRoutePreloader({
    eventDetail: () => {
      calls += 1;
      return Promise.resolve({ default: {} });
    },
  });

  assert.equal(preloadRoute('/events/event-1'), true);
  assert.equal(preloadRoute('/events/event-2'), true);
  assert.equal(calls, 0);

  return Promise.resolve().then(() => {
    assert.equal(calls, 1);
  });
});

test('returns false for routes without a known chunk', () => {
  const preloadRoute = createRoutePreloader({});

  assert.equal(preloadRoute('/missing'), false);
});
