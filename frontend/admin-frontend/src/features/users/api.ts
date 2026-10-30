import apiClient from '@/lib/axios';
import { PaginatedUsersResponse } from '../students/types';

export const userKeys = {
  all: ['users'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.all, 'list', filters] as const,
};

export const adminUserApi = {
  listAllUsers: async (params: {
    skip?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<PaginatedUsersResponse> => {
    const res = await apiClient.get<PaginatedUsersResponse>('/admin/users', { params });
    return res.data;
  },

  createAdmin: async (payload: { email: string; first_name?: string; last_name?: string }) => {
    const res = await apiClient.post('/admin/users/create-admin', payload);
    return res.data;
  },
};
