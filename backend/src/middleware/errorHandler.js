import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError, isDuplicateKeyError } from '../lib/errors.js';

const send = (res, status, code, message, details) =>
  res.status(status).json({ error: { code, message, ...(details && { details }) } });

export function notFoundHandler(req, res) {
  send(res, 404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}`);
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) return send(res, err.status, err.code, err.message, err.details);

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return send(res, 400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return send(res, 400, 'VALIDATION_ERROR', 'Invalid data', details);
  }
  if (err instanceof mongoose.Error.CastError) return send(res, 404, 'NOT_FOUND', 'Resource not found');
  if (isDuplicateKeyError(err)) return send(res, 409, 'DUPLICATE', 'Resource already exists');
  if (err.type === 'entity.parse.failed') return send(res, 400, 'INVALID_JSON', 'Malformed JSON body');

  req.log?.error({ err }, 'unhandled error');
  return send(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
}
