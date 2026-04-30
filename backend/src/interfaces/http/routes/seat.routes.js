import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';

export function makeSeatRoutes(seatController) {
  const router = Router();
  router.post('/hold',    authenticate, seatController.hold);
  router.post('/release', authenticate, seatController.release);
  return router;
}
