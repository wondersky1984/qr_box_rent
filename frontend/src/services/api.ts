import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface InternalAxiosRequestConfig<D = any> {
    _retry?: boolean;
  }
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let refreshHandler: (() => Promise<unknown>) | null = null;
let clearHandler: (() => void) | null = null;
let refreshPromise: Promise<unknown> | null = null;

export const registerAuthHandlers = (handlers: {
  refresh: () => Promise<unknown>;
  clear: () => void;
}) => {
  refreshHandler = handlers.refresh;
  clearHandler = handlers.clear;
};

const triggerSessionRefresh = () => {
  if (!refreshHandler) {
    return Promise.resolve(null);
  }
  if (!refreshPromise) {
    refreshPromise = refreshHandler().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig;
    const status = error.response?.status;
    const url = originalRequest?.url ?? '';

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        console.log('🔄 Попытка обновления токена...');
        const result = await triggerSessionRefresh();
        if (result) {
          console.log('✅ Токен успешно обновлен, повторяем запрос');
          return api(originalRequest);
        }
        console.log('❌ Не удалось обновить токен, очищаем сессию');
        clearHandler?.();
      } catch (refreshError) {
        console.log('❌ Ошибка при обновлении токена:', refreshError);
        clearHandler?.();
        throw refreshError;
      }
    }

    throw error;
  },
);
