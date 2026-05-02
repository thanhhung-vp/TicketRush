import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// ── Unit tests for payment helpers ────────────────────────

function buildMoMoSignature(params, secretKey) {
  const rawHash = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return crypto.createHmac('sha256', secretKey).update(rawHash).digest('hex');
}

function validatePaymentMethod(method) {
  return ['mock', 'vnpay', 'momo'].includes(method);
}

describe('Payment method validation', () => {
  it('accepts valid methods', () => {
    expect(validatePaymentMethod('mock')).toBe(true);
    expect(validatePaymentMethod('vnpay')).toBe(true);
    expect(validatePaymentMethod('momo')).toBe(true);
  });

  it('rejects invalid methods', () => {
    expect(validatePaymentMethod('paypal')).toBe(false);
    expect(validatePaymentMethod('')).toBe(false);
    expect(validatePaymentMethod('cash')).toBe(false);
  });
});

describe('MoMo signature generation', () => {
  it('produces consistent signatures for same input', () => {
    const params = { orderId: 'abc-123', amount: '100000', requestId: 'req-456' };
    const secret = 'test-secret-key';
    const sig1 = buildMoMoSignature(params, secret);
    const sig2 = buildMoMoSignature(params, secret);
    expect(sig1).toBe(sig2);
  });

  it('signatures differ for different secrets', () => {
    const params = { orderId: 'abc-123', amount: '100000' };
    const sig1 = buildMoMoSignature(params, 'secret-A');
    const sig2 = buildMoMoSignature(params, 'secret-B');
    expect(sig1).not.toBe(sig2);
  });

  it('signature is 64-char hex string (SHA256)', () => {
    const sig = buildMoMoSignature({ orderId: 'test' }, 'secret');
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('Seat selection constraints', () => {
  function validateSeatIds(ids) {
    if (!Array.isArray(ids)) return { ok: false, reason: 'Not an array' };
    if (ids.length === 0) return { ok: false, reason: 'Empty array' };
    if (ids.length > 10) return { ok: false, reason: 'Max 10 seats' };
    return { ok: true };
  }

  it('rejects empty array', () => {
    expect(validateSeatIds([]).ok).toBe(false);
  });

  it('rejects more than 10 seats', () => {
    expect(validateSeatIds(Array(11).fill('uuid')).ok).toBe(false);
  });

  it('accepts 1–10 seats', () => {
    expect(validateSeatIds(['seat-1']).ok).toBe(true);
    expect(validateSeatIds(Array(10).fill('uuid')).ok).toBe(true);
  });

  it('rejects non-array', () => {
    expect(validateSeatIds('not-array').ok).toBe(false);
  });
});
