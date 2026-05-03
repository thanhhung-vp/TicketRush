import crypto from 'crypto';

export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(otp, secret = process.env.JWT_SECRET || 'development-secret') {
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

export function verifyOtpHash(otp, expectedHash, secret = process.env.JWT_SECRET || 'development-secret') {
  if (!otp || !expectedHash) return false;

  const actual = Buffer.from(hashOtp(otp, secret), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
