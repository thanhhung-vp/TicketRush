import api from './api.js';

const unwrap = (response) => response.data?.data ?? response.data;

export const paymentService = {
  initiate: (seatIds, method) => api.post('/payment/initiate', { seat_ids: seatIds, method }).then(unwrap),
  confirm:  (orderId, method) => api.post('/payment/confirm', { order_id: orderId, method }).then(unwrap),
  cancel:   (orderId)         => api.post('/payment/cancel', { order_id: orderId }),
};
