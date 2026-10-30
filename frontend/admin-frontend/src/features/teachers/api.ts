import apiClient from '@/lib/axios';
import { TeacherCreatePayload } from './types';
import { PaginatedUsersResponse } from '../students/types';

export const teacherKeys = {
  all: ['teachers'] as const,
  list: (filters: Record<string, unknown>) => [...teacherKeys.all, 'list', filters] as const,
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
};

