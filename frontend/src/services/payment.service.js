import api from './api.js';

export const paymentService = {
  initiate: (seatIds, method) => api.post('/payment/initiate', { seat_ids: seatIds, method }).then(r => r.data.data),
  confirm:  (orderId, method) => api.post('/payment/confirm', { order_id: orderId, method }).then(r => r.data.data),
  cancel:   (orderId)         => api.post('/payment/cancel', { order_id: orderId }),
};
