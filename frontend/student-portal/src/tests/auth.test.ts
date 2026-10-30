import { describe, it, expect, beforeEach, vi, beforeAll, afterEach, afterAll } from 'vitest';
import axios from 'axios';
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
    if (body.identifier === '2fa@school.edu') {
      return HttpResponse.json({
        access_token: '',
        token_type: 'bearer',
        requires_2fa: true,
        temp_token: 'valid-temp-token',
      });
    }
    if (body.password === 'wrong-password') {
      return new HttpResponse(
        JSON.stringify({ detail: 'Invalid credentials' }),
        { status: 401 }
      );
    }
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      must_change_password: false,
    });
  }),

  http.post('/api/v1/auth/refresh', () => {
    refreshCallCount++;
    return HttpResponse.json({
      access_token: `refreshed-token-${refreshCallCount}`,
      token_type: 'bearer',
    });
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      id: 'user-123',
      email: 'student@school.edu',
      role: ROLES.STUDENT,
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

describe('Student Portal Auth & Interceptors', () => {
  it('stores access token in memory only and never in persist storage', () => {
    useAuthStore.getState().setAuth('secret-token', {
      id: '123',
      email: 'student@school.edu',
      role: ROLES.STUDENT,
      status: 'ACTIVE',
      must_change_password: false,
      totp_enabled: false,
      created_at: '',
      updated_at: '',
    });

    expect(useAuthStore.getState().accessToken).toBe('secret-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Verify localStorage has no tokens
    expect(localStorage.getItem('auth-storage')).toBeNull();
  });

  it('handles login with 2FA requirement', async () => {
    const res = await authApi.login({
      identifier: '2fa@school.edu',
      password: 'valid-password-123',
    });

    expect(res.requires_2fa).toBe(true);
    expect(res.temp_token).toBe('valid-temp-token');
  });

  it('handles invalid invite token rejection with clear message', async () => {
    await expect(
      authApi.acceptInvite({
        token: 'expired-token',
        new_password: 'Password123!',
      })
    ).rejects.toThrow();
  });

  it('performs single-flight token refresh when concurrent 401s occur', async () => {
    let callCounter = 0;
    server.use(
      http.get('/api/v1/protected-data', () => {
        callCounter++;
        if (callCounter <= 2) {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ data: 'success' });
      })
    );

    // Trigger two concurrent requests that both 401
    const p1 = apiClient.get('/protected-data');
    const p2 = apiClient.get('/protected-data');

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.data).toEqual({ data: 'success' });
    expect(r2.data).toEqual({ data: 'success' });
    // Single shared refresh promise should have fired exactly once
    expect(refreshCallCount).toBe(1);
  });
});
