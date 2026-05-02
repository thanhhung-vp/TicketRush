import { AppError } from '../../../domain/errors/AppError.js';
import { logger } from '../../../shared/logger.js';

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    const body = { success: false, error: err.message, code: err.code };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // PostgreSQL duplicate key
  if (err.code === '23505') {
    return res.status(409).json({ success: false, error: 'Already exists', code: 'CONFLICT' });
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
