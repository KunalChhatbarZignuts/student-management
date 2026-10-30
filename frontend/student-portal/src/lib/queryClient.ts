import { QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (failureCount >= 2) return false;
          if (error instanceof AxiosError) {
            const status = error.response?.status;
            // Never retry 401, 403, 404
            if (status === 401 || status === 403 || status === 404) {
              return false;
            }
            // Retry only on network error (no response) or 5xx server errors
            if (!status || status >= 500) {
              return true;
            }
          }
          return false;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let clientQueryClientSingleton: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return createQueryClient();
  } else {
    if (!clientQueryClientSingleton) {
      clientQueryClientSingleton = createQueryClient();
    }
    return clientQueryClientSingleton;
  }
}
