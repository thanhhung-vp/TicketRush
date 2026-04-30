import api from './api.js';

export const seatService = {
  hold:    (seatIds) => api.post('/seats/hold', { seat_ids: seatIds }).then(r => r.data.data),
  release: (seatIds) => api.post('/seats/release', { seat_ids: seatIds }),
};
