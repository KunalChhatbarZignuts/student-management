import apiClient from '@/lib/axios';
import { TeacherCreatePayload, ComprehensiveTeacherDetailResponse } from './types';
import { PaginatedUsersResponse } from '../students/types';

export const teacherKeys = {
  all: ['teachers'] as const,
  list: (filters: Record<string, unknown>) => [...teacherKeys.all, 'list', filters] as const,
  details: (id: string) => [...teacherKeys.all, 'details', id] as const,
};

export const adminTeacherApi = {
  listTeachers: async (params: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<PaginatedUsersResponse> => {
    const res = await apiClient.get<PaginatedUsersResponse>('/admin/users', {
      params: {
        role: 'teacher',
        ...params,
      },
    });
    return res.data;
  },

  createTeacher: async (payload: TeacherCreatePayload) => {
    const res = await apiClient.post('/admin/teachers', payload);
    return res.data;
  },

  getTeacherComprehensiveDetails: async (teacherId: string): Promise<ComprehensiveTeacherDetailResponse> => {
    const res = await apiClient.get<ComprehensiveTeacherDetailResponse>(`/admin/teachers/${teacherId}/details`);
    return res.data;
  },

  deleteTeacher: async (teacherId: string): Promise<{ message: string; id: string }> => {
    const res = await apiClient.delete<{ message: string; id: string }>(`/admin/teachers/${teacherId}`);
    return res.data;
  },
};


