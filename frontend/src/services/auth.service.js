import api from './api.js';

const BASE = '/auth';

export const authService = {
  login:      (email, password)  => api.post(`${BASE}/login`, { email, password }).then(r => r.data.data),
  register:   (payload)          => api.post(`${BASE}/register`, payload).then(r => r.data.data),
  refresh:    (refreshToken)     => api.post(`${BASE}/refresh`, { refreshToken }).then(r => r.data.data),
  logout:     (refreshToken)     => api.post(`${BASE}/logout`, { refreshToken }),
  logoutAll:  ()                 => api.post(`${BASE}/logout-all`),
  getMe:      ()                 => api.get(`${BASE}/me`).then(r => r.data.data),
  updateProfile: (payload)       => api.patch(`${BASE}/profile`, payload).then(r => r.data.data),
};
