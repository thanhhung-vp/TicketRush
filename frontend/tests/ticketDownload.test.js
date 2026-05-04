import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTicketFileName,
  buildTicketsSvg,
  filterTicketsForSeat,
  normalizeTicketsForDownload,
} from '../src/utils/ticketDownload.js';

const order = {
  id: '12345678-90ab-cdef-1234-567890abcdef',
  event_title: 'Bay Lac: Live/2026',
  venue: 'Thanh Hoa 36',
  event_date: '2026-04-30T06:17:00.000Z',
  total_amount: 15000,
  items: [
    {
      seat_id: 'seat-1',
      zone: 'Khu A',
      label: 'D01',
      price: 15000,
    },
    {
      seat_id: 'seat-2',
      zone: 'Khu A',
      label: 'E01',
      price: 15000,
    },
  ],
};

const tickets = [
  {
    id: 'ticket-1234567890',
    seat_id: 'seat-1',
    zone: 'Khu A',
    label: 'D01',
    qr_code: 'data:image/png;base64,abc123',
  },
  {
    id: 'ticket-0987654321',
    seat_id: 'seat-2',
    zone: 'Khu A',
    label: 'E01',
    qr_code: 'data:image/png;base64,def456',
  },
];

test('normalizes ticket rows with order metadata and matching seat prices', () => {
  const rows = normalizeTicketsForDownload(order, [tickets[0]]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].eventTitle, 'Bay Lac: Live/2026');
  assert.equal(rows[0].venue, 'Thanh Hoa 36');
  assert.equal(rows[0].zone, 'Khu A');
  assert.equal(rows[0].label, 'D01');
  assert.equal(rows[0].price, 15000);
  assert.equal(rows[0].qrCode, 'data:image/png;base64,abc123');
});

test('filters a ticket list down to the selected seat only', () => {
  const selectedTickets = filterTicketsForSeat(tickets, { seat_id: 'seat-2' });

  assert.equal(selectedTickets.length, 1);
  assert.equal(selectedTickets[0].id, 'ticket-0987654321');
});

test('builds a deterministic png filename from event title, order id, and selected seat', () => {
  assert.equal(
    buildTicketFileName(order, [tickets[0]]),
    'bay-lac-live-2026-d01-12345678.png',
  );
});

test('builds an SVG ticket sheet containing visible ticket details and QR data', () => {
  const result = buildTicketsSvg({
    order,
    tickets,
    locale: 'en-US',
    labels: {
      brand: 'TicketRush',
      ticketCode: 'Ticket Code',
      seat: 'Zone / Seat',
      location: 'Location',
      time: 'Time',
      valid: 'Valid',
      gate: 'Show QR at the gate',
    },
  });

  assert.equal(result.width, 960);
  assert.ok(result.height > 300);
  assert.match(result.svg, /Bay Lac: Live\/2026/);
  assert.match(result.svg, /Thanh Hoa 36/);
  assert.match(result.svg, /Khu A - D01/);
  assert.match(result.svg, /data:image\/png;base64,abc123/);
  assert.match(result.svg, /TicketRush/);
  assert.match(result.svg, /text-anchor="middle" class="stubCaption"/);
});

test('builds a one-ticket SVG when a selected ticket is passed from a multi-ticket order', () => {
  const result = buildTicketsSvg({
    order,
    tickets: [tickets[1]],
    locale: 'en-US',
    labels: {
      gate: 'Show QR at the gate',
    },
  });

  assert.equal(result.height, 410);
  assert.match(result.svg, /Khu A - E01/);
  assert.doesNotMatch(result.svg, /Khu A - D01/);
});
