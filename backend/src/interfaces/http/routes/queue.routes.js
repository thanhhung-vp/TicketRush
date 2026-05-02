import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';

export function makeQueueRoutes(queueController) {
  const router = Router();
  router.post('/:eventId/enter',   authenticate, queueController.enter);
  router.get('/:eventId/status',   authenticate, queueController.status);
  router.post('/:eventId/enable',  authenticate, queueController.enable);
  router.post('/:eventId/disable', authenticate, queueController.disable);
  router.post('/:eventId/admit',   authenticate, queueController.admit);
  return router;
}
