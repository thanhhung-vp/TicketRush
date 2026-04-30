import { AuthService } from '../../../application/AuthService.js';
import { registerSchema, loginSchema, profileSchema } from '../validators/auth.validators.js';
import { sendSuccess, sendCreated } from '../../../shared/response.js';
import { asyncHandler } from '../../../shared/asyncHandler.js';
import { ValidationError } from '../../../domain/errors/AppError.js';

const authService = new AuthService();

function validate(schema, body) {
  const r = schema.safeParse(body);
  if (!r.success) throw new ValidationError('Validation failed', r.error.flatten());
  return r.data;
}

export const AuthController = {
  register: asyncHandler(async (req, res) => {
    const data = validate(registerSchema, req.body);
    const result = await authService.register(data);
    sendCreated(res, result);
  }),

  login: asyncHandler(async (req, res) => {
    const data = validate(loginSchema, req.body);
    const result = await authService.login(data);
    sendSuccess(res, result);
  }),

  refresh: asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken);
    sendSuccess(res, result);
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, { ok: true });
  }),

  logoutAll: asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user.id);
    sendSuccess(res, { ok: true });
  }),

  getMe: asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id);
    sendSuccess(res, user);
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const data = validate(profileSchema, req.body);
    const user = await authService.updateProfile(req.user.id, data);
    sendSuccess(res, user);
  }),
};
