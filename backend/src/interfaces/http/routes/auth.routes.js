import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();
router.post('/register',    AuthController.register);
router.post('/login',       AuthController.login);
router.post('/refresh',     AuthController.refresh);
router.post('/logout',      AuthController.logout);
router.post('/logout-all',  authenticate, AuthController.logoutAll);
router.get('/me',           authenticate, AuthController.getMe);
router.patch('/profile',    authenticate, AuthController.updateProfile);
export default router;
