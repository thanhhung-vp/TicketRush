import assert from 'node:assert/strict';
import test from 'node:test';
import { canSelectSeatsForEvent, getEventSaleState } from '../src/utils/eventSaleState.js';

const now = new Date('2026-05-21T10:00:00.000Z');
const futureEventDate = '2026-05-22T10:00:00.000Z';

test('disables seat selection for scheduled events before sale opens', () => {
  assert.equal(canSelectSeatsForEvent({
    status: 'scheduled',
    event_date: futureEventDate,
    sale_start_at: '2026-05-21T11:00:00.000Z',
    zones: [{ available_seats: 10 }],
  }, now), false);
});

test('disables seat selection for on-sale events with a future sale start', () => {
  assert.equal(canSelectSeatsForEvent({
    status: 'on_sale',
    event_date: futureEventDate,
    sale_start_at: '2026-05-21T11:00:00.000Z',
    zones: [{ available_seats: 10 }],
  }, now), false);
});

test('enables seat selection only when the event is open and has seats', () => {
  assert.equal(canSelectSeatsForEvent({
    status: 'on_sale',
    event_date: futureEventDate,
    sale_start_at: '2026-05-21T09:00:00.000Z',
    zones: [{ available_seats: 10 }],
  }, now), true);
});

test('identifies sold out events separately from scheduled events', () => {
  assert.equal(getEventSaleState({
    status: 'on_sale',
    event_date: futureEventDate,
    zones: [{ available_seats: 0 }],
  }, now), 'soldout');
});

test('uses list-level available seats when detail zones are not loaded yet', () => {
  assert.equal(getEventSaleState({
    status: 'on_sale',
    event_date: futureEventDate,
    available_seats: 0,
  }, now), 'soldout');
});
