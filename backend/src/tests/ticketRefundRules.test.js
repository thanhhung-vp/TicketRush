import { describe, expect, it } from 'vitest';
import { getTicketRefundBlockReason } from '../utils/ticketRefundRules.js';

const futureDate = '2030-01-01T00:00:00.000Z';
const pastDate = '2020-01-01T00:00:00.000Z';

function createRefundableTicket(overrides = {}) {
  return {
    id: 'ticket-1',
    user_id: 'user-1',
    order_user_id: 'user-1',
    status: 'paid',
    checked_in_at: null,
    event_date: futureDate,
    has_pending_transfer: false,
    ...overrides,
  };
}

describe('ticket refund rules', () => {
  it('blocks when the ticket cannot be found for the current user', () => {
    expect(getTicketRefundBlockReason({ ticket: null })).toBe('ticket_not_found');
  });

  it('blocks transferred tickets from being refunded by the recipient account', () => {
    const ticket = createRefundableTicket({ user_id: 'recipient-1', order_user_id: 'buyer-1' });

    expect(getTicketRefundBlockReason({ ticket })).toBe('not_original_buyer');
  });

  it('blocks refunds for orders that are not paid', () => {
    const ticket = createRefundableTicket({ status: 'pending' });

    expect(getTicketRefundBlockReason({ ticket })).toBe('order_not_paid');
  });

  it('blocks checked-in tickets', () => {
    const ticket = createRefundableTicket({ checked_in_at: '2026-01-01T00:00:00.000Z' });

    expect(getTicketRefundBlockReason({ ticket })).toBe('ticket_checked_in');
  });

  it('blocks tickets for events that already ended', () => {
    const ticket = createRefundableTicket({ event_date: pastDate });

    expect(getTicketRefundBlockReason({ ticket, now: new Date('2026-01-01T00:00:00.000Z') }))
      .toBe('event_ended');
  });

  it('blocks tickets with a pending transfer', () => {
    const ticket = createRefundableTicket({ has_pending_transfer: true });

    expect(getTicketRefundBlockReason({ ticket })).toBe('pending_transfer');
  });

  it('allows refundable tickets', () => {
    expect(getTicketRefundBlockReason({ ticket: createRefundableTicket() })).toBe(null);
  });
});
