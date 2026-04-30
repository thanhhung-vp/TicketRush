import api from './api.js';

const BASE = '/events';

export const eventService = {
  list:        (params = {}) => api.get(BASE, { params }).then(r => r.data.data),
  getById:     (id)          => api.get(`${BASE}/${id}`).then(r => r.data.data),
  getSeats:    (id)          => api.get(`${BASE}/${id}/seats`).then(r => r.data.data),
  create:      (payload)     => api.post(BASE, payload).then(r => r.data.data),
  update:      (id, payload) => api.patch(`${BASE}/${id}`, payload).then(r => r.data.data),
  remove:      (id)          => api.delete(`${BASE}/${id}`),
  addZone:     (id, payload) => api.post(`${BASE}/${id}/zones`, payload).then(r => r.data.data),
  removeZone:  (id, zoneId)  => api.delete(`${BASE}/${id}/zones/${zoneId}`),
};
