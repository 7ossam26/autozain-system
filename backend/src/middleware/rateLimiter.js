// Rate limiter middleware — scaffold. Login limit wired in Phase 1.

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
