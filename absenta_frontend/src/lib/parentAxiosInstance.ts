import axios from 'axios';
import { LogService } from '../utils/LogService';
import { useParentAuthStore } from '../store/parentAuthStore';

const getEnvBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if ((globalThis as any).process?.env?.VITE_API_BASE_URL) {
    return (globalThis as any).process.env.VITE_API_BASE_URL;
  }
  return undefined;
};

const BASE_URL = getEnvBaseUrl();

if (!BASE_URL) {
  throw new Error('FATAL: VITE_API_BASE_URL is missing. Parent App cannot start.');
}

if (!BASE_URL.endsWith('/api')) {
  throw new Error(`FATAL: VITE_API_BASE_URL must end with "/api". Current value: ${BASE_URL}`);
}

const parentAxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

parentAxiosInstance.interceptors.request.use(
  (config) => {
    // Prevent double /api prefix
    if (config.url && config.url.startsWith('/api/')) {
       config.url = config.url.substring(4);
    }

    const token = localStorage.getItem('parent_access_token');
    console.log('🔥🔥🔥 AXIOS TOKEN =', token);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

parentAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    
    // Log error
    LogService.error('[ParentAPI]', error);

    // Handle 401 - Unauthorized (Token Expired/Invalid)
    if (error.response?.status === 401 && !originalRequest._retry) {
        useParentAuthStore.getState().setError('Akses tidak valid atau sudah kedaluwarsa.');
    }
    return Promise.reject(error);
  }
);

export default parentAxiosInstance;
