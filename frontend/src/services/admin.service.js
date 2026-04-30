import api from './api.js';

export const adminService = {
  events:    ()      => api.get('/admin/events').then(r => r.data.data),
  dashboard: ()      => api.get('/admin/dashboard').then(r => r.data.data),
  audience:  ()      => api.get('/admin/stats/audience').then(r => r.data.data),
  eventSeats:(id)    => api.get(`/admin/events/${id}/seats`).then(r => r.data.data),
  uploadImage:(file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
  },
};
