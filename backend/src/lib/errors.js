/**
 * Errors the client is expected to handle. `code` is stable and machine-readable;
 * the app switches on it (e.g. SOLD_OUT shows the "Competition full" state).
 */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new AppError(400, code, message, details);
export const unauthorized = (message = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (code, message) => new AppError(403, code, message);
export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (code, message, details) => new AppError(409, code, message, details);

export const isDuplicateKeyError = (err) => err?.code === 11000;
