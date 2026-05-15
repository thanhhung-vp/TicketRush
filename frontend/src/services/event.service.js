import api from './api.js';

const BASE = '/events';
const unwrap = (response) => response.data?.data ?? response.data;

export const eventService = {
  list:        (params = {}) => api.get(BASE, { params }).then(unwrap),
  getById:     (id)          => api.get(`${BASE}/${id}`).then(unwrap),
  getSeats:    (id)          => api.get(`${BASE}/${id}/seats`).then(unwrap),
  create:      (payload)     => api.post(BASE, payload).then(unwrap),
  update:      (id, payload) => api.patch(`${BASE}/${id}`, payload).then(unwrap),
  remove:      (id)          => api.delete(`${BASE}/${id}`),
  addZone:     (id, payload) => api.post(`${BASE}/${id}/zones`, payload).then(unwrap),
  removeZone:  (id, zoneId)  => api.delete(`${BASE}/${id}/zones/${zoneId}`),
  saveLayout:  (id, payload) => api.put(`${BASE}/${id}/layout`, payload).then(unwrap),
};
