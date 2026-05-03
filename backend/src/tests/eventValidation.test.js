import { describe, expect, it } from 'vitest';
import { eventSchema, eventUpdateSchema } from '../utils/eventValidation.js';

const validEvent = {
  title: 'Featured Concert',
  venue: 'Hanoi Opera House',
  event_date: '2026-06-15T19:00:00+07:00',
  category: 'music',
};

describe('event validation', () => {
  it('accepts a boolean featured flag for banner selection', () => {
    const result = eventSchema.safeParse({ ...validEvent, is_featured: true });

    expect(result.success).toBe(true);
    expect(result.data.is_featured).toBe(true);
  });

  it('rejects non-boolean featured flags', () => {
    const result = eventSchema.safeParse({ ...validEvent, is_featured: 'true' });

    expect(result.success).toBe(false);
  });

  it('allows partial updates without resetting the featured flag', () => {
    const result = eventUpdateSchema.safeParse({ title: 'Updated Concert' });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('is_featured');
  });

  it('allows nullable descriptions from existing events', () => {
    const result = eventUpdateSchema.safeParse({ description: null });

    expect(result.success).toBe(true);
    expect(result.data.description).toBeNull();
  });
});
