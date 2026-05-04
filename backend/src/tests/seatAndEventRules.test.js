import { describe, expect, it } from 'vitest';
import {
  ensureSingleEvent,
  validateSeatIds,
} from '../utils/seatHoldRules.js';
import { EVENT_DELETE_BLOCKED_ERROR, canDeleteEvent } from '../utils/eventDeletionRules.js';

describe('seat hold rules', () => {
  it('rejects an empty seat selection', () => {
    expect(validateSeatIds([])).toEqual({
      ok: false,
      status: 400,
      error: 'seat_ids must be a non-empty array',
    });
  });

  it('rejects more than 10 seats per hold', () => {
    expect(validateSeatIds(Array(11).fill('seat-id'))).toEqual({
      ok: false,
      status: 400,
      error: 'Cannot hold more than 10 seats at once',
    });
  });

  it('accepts 1 to 10 seats', () => {
    expect(validateSeatIds(['seat-1'])).toEqual({ ok: true });
    expect(validateSeatIds(Array.from({ length: 10 }, (_, i) => `seat-${i}`))).toEqual({ ok: true });
  });

  it('rejects duplicate seat ids', () => {
    expect(validateSeatIds(['seat-1', 'seat-1'])).toEqual({
      ok: false,
      status: 400,
      error: 'seat_ids must not contain duplicates',
    });
  });

  it('detects when one hold request crosses multiple events', () => {
    const result = ensureSingleEvent([
      { id: 'seat-1', event_id: 'event-1' },
      { id: 'seat-2', event_id: 'event-2' },
    ]);

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: 'Cannot hold seats from multiple events',
    });
  });
});

describe('event deletion rules', () => {
  it('allows deletion when no paid order, ticket, or sold seat exists', () => {
    expect(canDeleteEvent({ soldSeats: 0, lockedSeats: 0, paidOrders: 0, tickets: 0 })).toEqual({ ok: true });
  });

  it('rejects deletion when sold seats exist', () => {
    expect(canDeleteEvent({ soldSeats: 1, lockedSeats: 0, paidOrders: 0, tickets: 0 })).toEqual({
      ok: false,
      error: EVENT_DELETE_BLOCKED_ERROR,
    });
  });

  it('rejects deletion when seats are temporarily locked', () => {
    expect(canDeleteEvent({ soldSeats: 0, lockedSeats: 1, paidOrders: 0, tickets: 0 })).toEqual({
      ok: false,
      error: EVENT_DELETE_BLOCKED_ERROR,
    });
  });

  it('rejects deletion when paid order or tickets exist even if seats were later freed', () => {
    expect(canDeleteEvent({ soldSeats: 0, lockedSeats: 0, paidOrders: 1, tickets: 0 }).ok).toBe(false);
    expect(canDeleteEvent({ soldSeats: 0, lockedSeats: 0, paidOrders: 0, tickets: 1 }).ok).toBe(false);
  });

  it('rejects deletion when relational history would block removing the event', () => {
    expect(canDeleteEvent({ soldSeats: 0, lockedSeats: 0, paidOrders: 0, tickets: 0, orders: 1 }).ok)
      .toBe(false);
    expect(canDeleteEvent({ soldSeats: 0, lockedSeats: 0, paidOrders: 0, tickets: 0, adminActions: 1 }).ok)
      .toBe(false);
  });
});
