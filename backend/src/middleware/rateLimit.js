import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Per-user limit on state-changing endpoints (register, pay, submit). In-memory store is
 * fine for one instance; with several instances behind a load balancer, plug in a
 * shared store such as rate-limit-redis.
 */
export const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.writeRateLimitPerMinute,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user.id}`,
  handler: (_req, res) =>
    res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down a little' } }),
});
