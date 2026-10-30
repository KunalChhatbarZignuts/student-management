'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { authApi } from './api';
import { LoginFormData } from './schemas';
import { ADMIN_ALLOWED_ROLES, UserRole } from '@/lib/constants';
import { broadcastLogout, getAuthChannel } from '@/lib/broadcast';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    user,
    accessToken,
    isAuthenticated,
    isBootstrapped,
    requires2FA,
    tempToken,
    sessionError,
    setAuth,
    setAccessToken,
    setRequires2FA,
    clearAuth,
    setBootstrapped,
    setSessionError,
  } = useAuthStore();

  const role = user?.role;

  const hasRole = useCallback(
    (allowedRoles: UserRole[]): boolean => {
      if (!role) return false;
      return allowedRoles.includes(role);
    },
    [role]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuth();
      queryClient.clear();
      broadcastLogout();
      router.push('/login');
    }
  }, [clearAuth, queryClient, router]);

  useEffect(() => {
    const channel = getAuthChannel();
    if (!channel) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LOGOUT') {
        clearAuth('Logged out from another tab.');
        queryClient.clear();
        router.push('/login');
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
    };
  }, [clearAuth, queryClient, router]);

  const login = useCallback(
    async (credentials: LoginFormData) => {
      setSessionError(null);
      const res = await authApi.login(credentials);

      if (res.requires_2fa && res.temp_token) {
        setRequires2FA(res.temp_token);
        return { requires2FA: true };
      }

      setAccessToken(res.access_token);
      const userProfile = await authApi.getMe();

      // STRICT PORTAL ROLE CHECK:
      // admin-frontend: SUPER_ADMIN, ADMIN, TEACHER only.
      if (!ADMIN_ALLOWED_ROLES.includes(userProfile.role)) {
        await authApi.logout().catch(() => {});
        clearAuth();
        queryClient.clear();
        throw new Error("You don't have access to this portal");
      }

      setAuth(res.access_token, userProfile);

      if (res.must_change_password || userProfile.must_change_password) {
        router.push('/change-password');
        return { success: true, mustChangePassword: true };
      }

      router.push('/');
      return { success: true };
    },
    [clearAuth, queryClient, router, setAccessToken, setAuth, setRequires2FA, setSessionError]
  );

  const verify2FA = useCallback(
    async (code: string) => {
      if (!tempToken) {
        throw new Error('No 2FA session found. Please log in again.');
      }

      const res = await authApi.verify2FA({ code, temp_token: tempToken });
      setAccessToken(res.access_token);

      const userProfile = await authApi.getMe();

      if (!ADMIN_ALLOWED_ROLES.includes(userProfile.role)) {
        await authApi.logout().catch(() => {});
        clearAuth();
        queryClient.clear();
        throw new Error("You don't have access to this portal");
      }

      setAuth(res.access_token, userProfile);

      if (res.must_change_password || userProfile.must_change_password) {
        router.push('/change-password');
        return { success: true, mustChangePassword: true };
      }

      router.push('/');
      return { success: true };
    },
    [clearAuth, queryClient, router, setAccessToken, setAuth, tempToken]
  );

  return {
    user,
    role,
    accessToken,
    isAuthenticated,
    isBootstrapped,
    requires2FA,
    tempToken,
    sessionError,
    hasRole,
    login,
    logout,
    verify2FA,
    setBootstrapped,
    setSessionError,
  };
}

