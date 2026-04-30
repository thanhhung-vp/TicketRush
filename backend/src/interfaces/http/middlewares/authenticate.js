import { AuthService } from '../../../application/AuthService.js';
import { AuthError } from '../../../domain/errors/AppError.js';

const authService = new AuthService();

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AuthError('No token provided'));
  try {
    req.user = authService.verifyAccessToken(header.slice(7));
    next();
  } catch (err) {
    next(err);
  }
}
