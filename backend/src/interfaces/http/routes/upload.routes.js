import { Router } from 'express';
import { UploadController } from '../controllers/UploadController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAdmin } from '../middlewares/requireRole.js';

const router = Router();
router.post('/image', authenticate, requireAdmin, UploadController.uploadMiddleware, UploadController.uploadImage);
export default router;
