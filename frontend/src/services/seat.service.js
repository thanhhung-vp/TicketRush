import api from './api.js';

const unwrap = (response) => response.data?.data ?? response.data;

export const seatService = {
  hold:    (seatIds) => api.post('/seats/hold', { seat_ids: seatIds }).then(unwrap),
  release: (seatIds) => api.post('/seats/release', { seat_ids: seatIds }),
};
