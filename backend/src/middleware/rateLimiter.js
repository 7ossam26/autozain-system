// Rate limiters used across the API.

import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body?.username || ''}`,
  message: {
    success: false,
    message: 'حاولت كتير — استنى شوية وحاول تاني',
    error_code: 'RATE_LIMITED',
  },
});

// Buyer contact-request submission: 3 per 5 min per IP (MASTER_PLAN §16 edge cases).
export const contactRequestRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'حاولت كتير — استنى شوية وحاول تاني',
    error_code: 'RATE_LIMITED',
  },
});

// Queue join: 3 per 5 min per IP.
export const queueRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'حاولت كتير — استنى شوية وحاول تاني',
    error_code: 'RATE_LIMITED',
  },
});
