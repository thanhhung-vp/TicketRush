import { describe, expect, it } from 'vitest';
import { generateOtp, hashOtp, verifyOtpHash } from '../services/otp.js';

describe('OTP helpers', () => {
  it('generates a 6 digit code', () => {
    expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it('hashes OTP without storing the raw code', () => {
    const hash = hashOtp('123456', 'test-secret');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe('123456');
  });

  it('verifies matching OTP hashes', () => {
    const hash = hashOtp('123456', 'test-secret');

    expect(verifyOtpHash('123456', hash, 'test-secret')).toBe(true);
    expect(verifyOtpHash('654321', hash, 'test-secret')).toBe(false);
  });
});
