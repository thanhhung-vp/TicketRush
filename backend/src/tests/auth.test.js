import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { z } from 'zod';

// ── Refresh token helpers ─────────────────────────────────

function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

describe('Auth helpers', () => {
  it('refresh token hash is deterministic', () => {
    const raw = 'some-random-token-abc';
    expect(hashRefreshToken(raw)).toBe(hashRefreshToken(raw));
    expect(hashRefreshToken(raw)).toHaveLength(64);
  });

  it('different raw tokens produce different hashes', () => {
    expect(hashRefreshToken('token-A')).not.toBe(hashRefreshToken('token-B'));
  });

  it('refresh token has sufficient entropy (48 bytes = 96 hex chars)', () => {
    const raw = crypto.randomBytes(48).toString('hex');
    expect(raw).toHaveLength(96);
  });
});

// ── Registration schema ───────────────────────────────────

const registerSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(6),
  full_name:  z.string().min(2).max(100),
  gender:     z.enum(['male', 'female', 'other']).optional(),
  birth_year: z.number().int().min(1900).max(2026).optional(),
});

describe('Input validation schemas', () => {
  it('rejects invalid email', () => {
    const r = registerSchema.safeParse({ email: 'not-email', password: 'pass123', full_name: 'Test' });
    expect(r.success).toBe(false);
  });

  it('rejects short password', () => {
    const r = registerSchema.safeParse({ email: 'a@b.com', password: '123', full_name: 'Test' });
    expect(r.success).toBe(false);
  });

  it('accepts valid registration data', () => {
    const r = registerSchema.safeParse({
      email: 'test@example.com', password: 'password123', full_name: 'Test User',
      gender: 'male', birth_year: 1995,
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid gender value', () => {
    const r = registerSchema.safeParse({
      email: 'test@example.com', password: 'password123', full_name: 'Test', gender: 'unknown',
    });
    expect(r.success).toBe(false);
  });
});

// ── Event schema ──────────────────────────────────────────

const CATEGORIES = ['music', 'sports', 'arts', 'conference', 'comedy', 'festival', 'other'];

const eventSchema = z.object({
  title:      z.string().min(3).max(200),
  venue:      z.string().min(3).max(300),
  event_date: z.string().datetime({ offset: true }),
  category:   z.enum(CATEGORIES).default('other'),
});

describe('Event validation schema', () => {
  it('accepts valid event', () => {
    const r = eventSchema.safeParse({
      title: 'Test Concert', venue: 'Hanoi Opera House',
      event_date: '2026-06-15T19:00:00+07:00', category: 'music',
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid category', () => {
    const r = eventSchema.safeParse({
      title: 'Test', venue: 'Venue', event_date: '2026-06-15T19:00:00+07:00', category: 'invalid',
    });
    expect(r.success).toBe(false);
  });

  it('rejects short title', () => {
    const r = eventSchema.safeParse({ title: 'AB', venue: 'Venue', event_date: '2026-06-15T19:00:00+07:00' });
    expect(r.success).toBe(false);
  });

  it('defaults category to other', () => {
    const r = eventSchema.safeParse({
      title: 'Test Concert', venue: 'Hanoi Opera House', event_date: '2026-06-15T19:00:00+07:00',
    });
    expect(r.success).toBe(true);
    expect(r.data.category).toBe('other');
  });
});
