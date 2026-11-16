import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, STUDENT_PORTAL_ALLOWED_ROLES } from './constants';
import { useAuthStore } from '@/store/authStore';
import { TokenResponse } from '@/features/auth/types';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Portal': 'student',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token & Portal Header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (config.headers) {
      if (token) {
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      if (typeof config.headers.set === 'function') {
        config.headers.set('X-Client-Portal', 'student');
      } else {
        config.headers['X-Client-Portal'] = 'student';
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Single-flight refresh on 401 or 403
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const shouldRefresh = status === 401 || status === 403;
    const isAuthUrl =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login');

    if (shouldRefresh && !originalRequest._retry && !isAuthUrl) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest._retry = true;
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              originalRequest.headers['authorization'] = `Bearer ${token}`;
              if (typeof originalRequest.headers.set === 'function') {
                originalRequest.headers.set('Authorization', `Bearer ${token}`);
              }
            }
            console.debug('[AuthInterceptor] Retrying queued Student Portal request with new token:', originalRequest.url);
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.debug('[AuthInterceptor] Status', status, '- Calling /auth/refresh for Student Portal...');
        const response = await axios.post<TokenResponse>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'X-Client-Portal': 'student' },
          }
        );

        const newAccessToken = response.data.access_token;
        const refreshedUser = response.data.user;

        // Set the newly received access token
        useAuthStore.getState().setAccessToken(newAccessToken, refreshedUser || undefined);

        // Update headers on the current request
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers['authorization'] = `Bearer ${newAccessToken}`;
          if (typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
          }
        }

        // Release all queued requests with the new token
        processQueue(null, newAccessToken);

        console.debug('[AuthInterceptor] Retrying failed Student Portal request with new access token:', originalRequest.url);
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Only logout when the refresh token API call itself fails
        console.error('[AuthInterceptor] Refresh token call failed in Student Portal. Logging out user:', refreshError);
        processQueue(refreshError, null);
        useAuthStore
          .getState()
          .clearAuth('Your session has expired. Please log in again.');

        if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);


export default apiClient;

