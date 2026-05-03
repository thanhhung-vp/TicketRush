import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

const getToken = (key) => localStorage.getItem(key);

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
];

function isPublicAuthRequest(config) {
  const url = config?.url || '';
  const normalized = url.startsWith('/api') ? url.slice(4) : url;
  return PUBLIC_AUTH_PATHS.some(path => normalized.startsWith(path));
}

api.interceptors.request.use((config) => {
  const token = getToken('accessToken') || getToken('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && original && !original._retry && !isPublicAuthRequest(original)) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then(token => { original.headers.Authorization = `Bearer ${token}`; return api(original); });
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = getToken('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }
      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        const payload = data.data || data;
        localStorage.setItem('accessToken', payload.accessToken);
        localStorage.setItem('refreshToken', payload.refreshToken);
        localStorage.setItem('token', payload.accessToken);
        processQueue(null, payload.accessToken);
        original.headers.Authorization = `Bearer ${payload.accessToken}`;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
