import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../lib/errors.js';

// Build the HMAC key once. Given a plain string, jsonwebtoken tries to parse it as a
// public key on every call (which throws, then falls back): that alone was ~10% of API
// CPU under load in profiling.
const secretKey = crypto.createSecretKey(Buffer.from(env.jwtSecret, 'utf8'));
const ALGORITHMS = ['HS256'];

export function signToken(userId) {
  return jwt.sign({}, secretKey, { subject: String(userId), expiresIn: env.jwtExpiresIn, algorithm: 'HS256' });
}

/** Stateless auth: the token carries the user id, so no DB lookup per request. */
export function requireAuth(req, _res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, secretKey, { algorithms: ALGORITHMS });
    req.user = { id: payload.sub };
    return next();
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
}
