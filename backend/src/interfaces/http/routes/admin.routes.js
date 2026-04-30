import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAdmin } from '../middlewares/requireRole.js';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/events',           AdminController.events);
router.get('/dashboard',        AdminController.dashboard);
router.get('/stats/audience',   AdminController.audience);
router.get('/events/:id/seats', AdminController.eventSeats);
export default router;
