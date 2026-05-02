import { ForbiddenError } from '../../../domain/errors/AppError.js';

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return next(new ForbiddenError('Admin only'));
  next();
};
