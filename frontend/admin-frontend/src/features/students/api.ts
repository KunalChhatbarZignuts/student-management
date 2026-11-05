import apiClient from '@/lib/axios';
import { StudentCreatePayload, PaginatedUsersResponse, ComprehensiveStudentDetailResponse } from './types';

export const studentKeys = {
  all: ['students'] as const,
  list: (filters: Record<string, unknown>) => [...studentKeys.all, 'list', filters] as const,
  details: (id: string) => [...studentKeys.all, 'details', id] as const,
};

export const adminStudentApi = {
  listStudents: async (params: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<PaginatedUsersResponse> => {
    const res = await apiClient.get<PaginatedUsersResponse>('/admin/users', {
      params: {
        role: 'student',
        ...params,
      },
    });
    return res.data;
  },

  createStudent: async (payload: StudentCreatePayload) => {
    const res = await apiClient.post('/admin/students', payload);
    return res.data;
  },

  getStudentProfile: async (studentId: string) => {
    const res = await apiClient.get(`/admin/students/${studentId}/profile`);
    return res.data;
  },

  getStudentComprehensiveDetails: async (studentId: string): Promise<ComprehensiveStudentDetailResponse> => {
    const res = await apiClient.get<ComprehensiveStudentDetailResponse>(`/admin/students/${studentId}/details`);
    return res.data;
  },

  updateStudent: async (studentId: string, payload: any) => {
    const res = await apiClient.patch(`/admin/students/${studentId}`, payload);
    return res.data;
  },

  suspendUser: async (userId: string) => {
    const res = await apiClient.patch(`/admin/users/${userId}/suspend`);
    return res.data;
  },

  activateUser: async (userId: string) => {
    const res = await apiClient.patch(`/admin/users/${userId}/activate`);
    return res.data;
  },

  deactivateUser: async (userId: string) => {
    const res = await apiClient.patch(`/admin/users/${userId}/deactivate`);
    return res.data;
  },

  resendInvite: async (userId: string) => {
    const res = await apiClient.post(`/admin/users/${userId}/resend-invite`);
    return res.data;
  },

  triggerPasswordReset: async (userId: string) => {
    const res = await apiClient.post(`/admin/users/${userId}/trigger-password-reset`);
    return res.data;
  },
};

