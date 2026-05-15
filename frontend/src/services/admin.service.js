import api from './api.js';

const unwrap = (response) => response.data?.data ?? response.data;

export const adminService = {
  events:    ()      => api.get('/admin/events').then(unwrap),
  dashboard: ()      => api.get('/admin/dashboard').then(unwrap),
  audience:  ()      => api.get('/admin/stats/audience').then(unwrap),
  eventSeats:(id)    => api.get(`/admin/events/${id}/seats`).then(unwrap),
  uploadImage:(file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap);
  },
};
