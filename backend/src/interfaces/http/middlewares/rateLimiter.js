import rateLimit from 'express-rate-limit';

const opts = (max, windowMs = 15 * 60 * 1000) => ({
  windowMs, max, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

export const globalLimiter   = rateLimit(opts(300));
export const authLimiter     = rateLimit(opts(20));
export const checkoutLimiter = rateLimit(opts(5, 60_000));
