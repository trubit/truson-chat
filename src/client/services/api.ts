import axios from 'axios';
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ---------------------------------------------------------------------------
// Client-side resilience helpers (no server imports)
// ---------------------------------------------------------------------------

function clientDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withClientRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const status = (err as { response?: { status: number } }).response?.status;
      // Retry only on 5xx or network errors (no HTTP response at all)
      // Never retry on 4xx — those are client errors
      const isRetryable = status === undefined || status >= 500;
      if (attempt >= maxAttempts || !isRetryable) throw err;
      // Full jitter exponential backoff
      const cap = Math.min(300 * Math.pow(2, attempt - 1), 8_000);
      await clientDelay(Math.round(Math.random() * cap));
    }
  }
}

// ---------------------------------------------------------------------------

let isRefreshing = false;

// Separate queues so success and failure callbacks are called correctly.
let resolveSubscribers: Array<(token: string) => void> = [];
let rejectSubscribers: Array<(error: unknown) => void> = [];

const onTokenRefreshed = (token: string): void => {
  resolveSubscribers.forEach((cb) => cb(token));
  resolveSubscribers = [];
  rejectSubscribers = [];
};

const onRefreshFailed = (error: unknown): void => {
  rejectSubscribers.forEach((cb) => cb(error));
  resolveSubscribers = [];
  rejectSubscribers = [];
};

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30_000,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request — it will retry once the refresh completes.
      return new Promise<AxiosResponse>((resolve, reject) => {
        resolveSubscribers.push((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          resolve(api(originalRequest));
        });
        rejectSubscribers.push(reject);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await api.post<{ data: { accessToken: string } }>(
        '/auth/refresh',
        {},
        {
          withCredentials: true,
        },
      );
      const { accessToken } = response.data.data;

      useAuthStore.getState().setToken(accessToken);
      onTokenRefreshed(accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      onRefreshFailed(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await withClientRetry(() => api.request<T>(config));
  return response.data;
};

export const apiService = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'GET', url }),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'POST', url, data }),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'PUT', url, data }),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'PATCH', url, data }),

  del: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    request<T>({ ...config, method: 'DELETE', url }),
};
