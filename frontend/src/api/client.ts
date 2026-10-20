import axios from 'axios';

export const TOKEN_KEY = 'cms_admin_token';
export const AUTH_EXPIRED_EVENT = 'cms:auth-expired';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { Accept: 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  },
);

export default api;
