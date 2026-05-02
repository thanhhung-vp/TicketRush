import { Router } from 'express';
import { EventController } from '../controllers/EventController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAdmin } from '../middlewares/requireRole.js';

const router = Router();
router.get('/',                     EventController.list);
router.get('/:id',                  EventController.getOne);
router.get('/:id/seats',            EventController.getSeats);
router.post('/',                    authenticate, requireAdmin, EventController.create);
router.patch('/:id',                authenticate, requireAdmin, EventController.update);
router.delete('/:id',               authenticate, requireAdmin, EventController.remove);
router.post('/:id/zones',           authenticate, requireAdmin, EventController.addZone);
router.delete('/:id/zones/:zoneId', authenticate, requireAdmin, EventController.removeZone);
export default router;
