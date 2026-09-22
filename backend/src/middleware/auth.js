import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../lib/errors.js';

export function signToken(userId) {
  return jwt.sign({}, env.jwtSecret, { subject: String(userId), expiresIn: env.jwtExpiresIn });
}

/** Stateless auth: the token carries the user id, so no DB lookup per request. */
export function requireAuth(req, _res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub };
    return next();
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
}
