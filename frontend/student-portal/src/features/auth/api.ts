import apiClient from '@/lib/axios';
import {
  TokenResponse,
  User,
  MessageResponse,
} from './types';
import {
  LoginFormData,
  AcceptInviteFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  ChangePasswordFormData,
} from './schemas';

export const authApi = {
  login: async (data: LoginFormData): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/auth/login', data);
    return res.data;
  },

  refresh: async (): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/auth/refresh', {});
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },

  logout: async (): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/auth/logout', {});
    return res.data;
  },

  acceptInvite: async (data: { token: string; new_password: string }): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/auth/accept-invite', data);
    return res.data;
  },

  forgotPassword: async (data: ForgotPasswordFormData): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/auth/forgot-password', data);
    return res.data;
  },

  resetPassword: async (data: { token: string; new_password: string }): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/auth/reset-password', data);
    return res.data;
  },

  changePassword: async (data: { old_password?: string; new_password: string }): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/auth/change-password', data);
    return res.data;
  },
};
