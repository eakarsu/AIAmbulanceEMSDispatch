const rateLimit = require('express-rate-limit');

/**
 * General rate limiter: 100 requests per 15 minutes per IP.
 * Applied to all non-AI API routes.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Limit: 100 per 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth brute-force limiter: 10 attempts per 15 minutes per IP.
 * Applied to login and register endpoints.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * AI rate limiter: 20 requests per hour per user.
 * Defined here for reference — the actual instance is in routes/ai.js
 * because it uses a custom keyGenerator (user ID-based).
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many AI requests. Limit: 20 per hour for medical AI.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
});

module.exports = { generalLimiter, authLimiter, aiRateLimiter };
