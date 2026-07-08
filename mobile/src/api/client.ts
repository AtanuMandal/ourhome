import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as tokenStore from '../auth/tokenStore';

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://192.168.1.6:7071/api';
let authEventListener: (() => void) | null = null;

export function setAuthEventListener(listener: () => void): void {
  authEventListener = listener;
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStore.getToken();
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await tokenStore.clearTokens();
      authEventListener?.();
    }
    return Promise.reject(error);
  }
);

export default api;
