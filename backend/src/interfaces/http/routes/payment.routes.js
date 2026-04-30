import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';

export function makePaymentRoutes(paymentController) {
  const router = Router();
  router.post('/initiate',   authenticate, paymentController.initiate);
  router.post('/confirm',    authenticate, paymentController.confirm);
  router.post('/cancel',     authenticate, paymentController.cancel);
  router.post('/vnpay/ipn',  paymentController.vnpayIpn);
  router.post('/momo/ipn',   paymentController.momoIpn);
  return router;
}
