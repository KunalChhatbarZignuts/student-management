import { describe, it, expect, beforeEach, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/axios';
import { authApi } from '@/features/auth/api';
import { ROLES } from '@/lib/constants';

let refreshCallCount = 0;

const server = setupServer(
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as any;
    if (body.identifier === 'locked@school.edu') {
      return new HttpResponse(
        JSON.stringify({ detail: 'Account is temporarily locked due to multiple failed attempts.' }),
        { status: 429 }
      );
    }
    if (body.identifier === 'admin2fa@school.edu') {
      return HttpResponse.json({
        access_token: '',
        token_type: 'bearer',
        requires_2fa: true,
        temp_token: 'valid-admin-temp-token',
      });
    }
    if (body.password === 'wrong-password') {
      return new HttpResponse(
        JSON.stringify({ detail: 'Invalid credentials' }),
        { status: 401 }
      );
    }
    return HttpResponse.json({
      access_token: 'mock-admin-access-token',
      token_type: 'bearer',
      must_change_password: false,
    });
  }),

  http.post('/api/v1/auth/refresh', () => {
    refreshCallCount++;
    return HttpResponse.json({
      access_token: `refreshed-admin-token-${refreshCallCount}`,
      token_type: 'bearer',
    });
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      id: 'admin-123',
      email: 'admin@school.edu',
      role: ROLES.ADMIN,
      status: 'ACTIVE',
      must_change_password: false,
      totp_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  http.post('/api/v1/auth/accept-invite', async ({ request }) => {
    const body = (await request.json()) as any;
    if (body.token === 'expired-token') {
      return new HttpResponse(
        JSON.stringify({ detail: 'Invite token has expired or is invalid' }),
        { status: 400 }
      );
    }
    return HttpResponse.json({ message: 'Account activated successfully' });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  refreshCallCount = 0;
  useAuthStore.getState().clearAuth();
});
afterAll(() => server.close());

describe('Admin Frontend Auth & Security Interceptors', () => {
  it('stores access token in memory only and never in persist storage', () => {
    useAuthStore.getState().setAuth('secret-admin-token', {
      id: 'admin-1',
      email: 'admin@school.edu',
      role: ROLES.ADMIN,
      status: 'ACTIVE',
      must_change_password: false,
      totp_enabled: false,
      created_at: '',
      updated_at: '',
    });

    expect(useAuthStore.getState().accessToken).toBe('secret-admin-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    expect(localStorage.getItem('auth-storage')).toBeNull();
  });

  it('handles admin login requiring 2FA step', async () => {
    const res = await authApi.login({
      identifier: 'admin2fa@school.edu',
      password: 'SecurePassword123!',
    });

    expect(res.requires_2fa).toBe(true);
    expect(res.temp_token).toBe('valid-admin-temp-token');
  });

  it('rejects invalid invite tokens with clean error response', async () => {
    await expect(
      authApi.acceptInvite({
        token: 'expired-token',
        new_password: 'Password123!',
      })
    ).rejects.toThrow();
  });

  it('performs single-flight token refresh mutex on concurrent 401 errors', async () => {
    let callCounter = 0;
    server.use(
      http.get('/api/v1/protected-admin-data', () => {
        callCounter++;
        if (callCounter <= 2) {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ data: 'admin-success' });
      })
    );

    const p1 = apiClient.get('/protected-admin-data');
    const p2 = apiClient.get('/protected-admin-data');

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.data).toEqual({ data: 'admin-success' });
    expect(r2.data).toEqual({ data: 'admin-success' });
    expect(refreshCallCount).toBe(1);
  });
});
