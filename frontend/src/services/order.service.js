import api from './api.js';

export const orderService = {
  myOrders:   ()             => api.get('/orders').then(r => r.data.data),
  getTickets: (orderId)      => api.get(`/orders/${orderId}/tickets`).then(r => r.data.data),
};
