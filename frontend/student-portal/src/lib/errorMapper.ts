import { AxiosError } from 'axios';

interface BackendErrorResponse {
  detail?: string | Array<{ loc?: (string | number)[]; msg?: string }>;
  message?: string;
}

export function formatErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback;

  if (error instanceof AxiosError) {
    const data = error.response?.data as BackendErrorResponse | undefined;

    if (error.response?.status === 429) {
      return data?.detail && typeof data.detail === 'string'
        ? data.detail
        : 'Too many attempts. Account is temporarily locked. Please try again later.';
    }

    if (error.response?.status === 401) {
      return data?.detail && typeof data.detail === 'string'
        ? data.detail
        : 'Invalid credentials. Please check your login details.';
    }

    if (data?.detail) {
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        return data.detail.map((err) => err.msg || 'Validation error').join(', ');
      }
    }

    if (data?.message) {
      return data.message;
    }

    if (error.message === 'Network Error') {
      return 'Unable to connect to the server. Please check your connection.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
