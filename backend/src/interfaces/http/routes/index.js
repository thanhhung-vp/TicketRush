import { Router } from 'express';
import authRoutes   from './auth.routes.js';
import eventRoutes  from './event.routes.js';
import uploadRoutes from './upload.routes.js';
import adminRoutes  from './admin.routes.js';
import { makeSeatRoutes }    from './seat.routes.js';
import { makeOrderRoutes }   from './order.routes.js';
import { makePaymentRoutes } from './payment.routes.js';
import { makeQueueRoutes }   from './queue.routes.js';

export function createRouter({ seatController, orderController, paymentController, queueController }) {
  const router = Router();
  router.use('/auth',    authRoutes);
  router.use('/events',  eventRoutes);
  router.use('/upload',  uploadRoutes);
  router.use('/admin',   adminRoutes);
  router.use('/seats',   makeSeatRoutes(seatController));
  router.use('/orders',  makeOrderRoutes(orderController));
  router.use('/payment', makePaymentRoutes(paymentController));
  router.use('/queue',   makeQueueRoutes(queueController));
  router.get('/health',  (_, res) => res.json({ success: true, ts: Date.now() }));
  return router;
}
