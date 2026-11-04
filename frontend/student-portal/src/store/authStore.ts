import { create } from 'zustand';
import { User } from '@/features/auth/types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  sessionError: string | null;
  setAuth: (accessToken: string, user: User) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  clearAuth: (reason?: string) => void;
  setBootstrapped: (isBootstrapped: boolean) => void;
  setSessionError: (msg: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isBootstrapped: false,
  sessionError: null,

  setAuth: (accessToken, user) =>
    set({
      accessToken,
      user,
      isAuthenticated: true,
      sessionError: null,
    }),

  setAccessToken: (accessToken) =>
    set((state) => ({
      accessToken,
      isAuthenticated: !!state.user,
    })),

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
    }),

  clearAuth: (reason) =>
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      sessionError: reason || null,
    }),

  setBootstrapped: (isBootstrapped) =>
    set({
      isBootstrapped,
    }),

  setSessionError: (sessionError) =>
    set({
      sessionError,
    }),
}));
