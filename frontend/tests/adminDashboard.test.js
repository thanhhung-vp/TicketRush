import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterOccupancyEvents,
  getEventOccupancyPercent,
  getOccupancyPage,
} from '../src/utils/adminDashboard.js';

test('filters occupancy events by title or venue without accent sensitivity', () => {
  const events = [
    { id: 'hn', title: 'Dem nhac Ha Noi', venue: 'Nha hat lon', sold_seats: 20, total_seats: 100 },
    { id: 'sg', title: 'Live Sai Gon', venue: 'San van dong', sold_seats: 5, total_seats: 10 },
    { id: 'dn', title: 'Da Nang countdown', venue: 'Bien Dong', sold_seats: 0, total_seats: 0 },
  ];

  assert.deepEqual(filterOccupancyEvents(events, 'ha noi').map(event => event.id), ['hn']);
  assert.deepEqual(filterOccupancyEvents(events, 'san van').map(event => event.id), ['sg']);
  assert.deepEqual(events.map(event => event.id), ['hn', 'sg', 'dn']);
});

test('paginates filtered occupancy events and clamps requested page', () => {
  const events = Array.from({ length: 13 }, (_, index) => ({
    id: `event-${index + 1}`,
    title: `Event ${index + 1}`,
    sold_seats: index,
    total_seats: 20,
  }));

  const page = getOccupancyPage(events, { page: 3, pageSize: 5, query: 'event' });
  assert.equal(page.currentPage, 3);
  assert.equal(page.totalPages, 3);
  assert.deepEqual(page.items.map(event => event.id), ['event-11', 'event-12', 'event-13']);

  const clamped = getOccupancyPage(events, { page: 9, pageSize: 5, query: '' });
  assert.equal(clamped.currentPage, 3);
});

test('calculates event occupancy percent defensively', () => {
  assert.equal(getEventOccupancyPercent({ sold_seats: 7, total_seats: 10 }), 70);
  assert.equal(getEventOccupancyPercent({ sold_seats: 3, total_seats: 0 }), 0);
  assert.equal(getEventOccupancyPercent({ sold_seats: 'not-a-number', total_seats: 10 }), 0);
});
