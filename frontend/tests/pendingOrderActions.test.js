import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPendingOrderCheckoutState,
  isPendingOrderActionable,
} from '../src/utils/pendingOrderActions.js';

const pendingOrder = {
  id: 'order-1',
  event_id: 'event-1',
  status: 'pending',
  items: [
    { seat_id: 'seat-1', label: 'A1', zone: 'VIP', price: '150000' },
    { seat_id: 'seat-2', label: 'A2', zone: 'VIP', price: 150000 },
  ],
};

test('builds checkout navigation state from a pending order', () => {
  assert.deepEqual(buildPendingOrderCheckoutState(pendingOrder), {
    order_id: 'order-1',
    event_id: 'event-1',
    seat_ids: ['seat-1', 'seat-2'],
    seat_info: [
      {
        id: 'seat-1',
        seat_id: 'seat-1',
        event_id: 'event-1',
        label: 'A1',
        zone_name: 'VIP',
        price: '150000',
      },
      {
        id: 'seat-2',
        seat_id: 'seat-2',
        event_id: 'event-1',
        label: 'A2',
        zone_name: 'VIP',
        price: 150000,
      },
    ],
  });
});

test('treats only pending orders with seats as actionable', () => {
  assert.equal(isPendingOrderActionable(pendingOrder), true);
  assert.equal(isPendingOrderActionable({ ...pendingOrder, status: 'paid' }), false);
  assert.equal(isPendingOrderActionable({ ...pendingOrder, items: [] }), false);
});
