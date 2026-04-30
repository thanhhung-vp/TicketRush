import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';

export function makeOrderRoutes(orderController) {
  const router = Router();
  router.get('/',                authenticate, orderController.myOrders);
  router.get('/:id/tickets',     authenticate, orderController.getTickets);
  router.post('/checkout',       authenticate, orderController.checkout);
  return router;
}
