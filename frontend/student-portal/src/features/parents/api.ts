import apiClient from '@/lib/axios';
import { StudentResponse } from '../students/types';

export const parentKeys = {
  all: ['parents'] as const,
  children: () => [...parentKeys.all, 'children'] as const,
};

export const parentApi = {
  getMyChildren: async (): Promise<StudentResponse[]> => {
    const res = await apiClient.get<StudentResponse[]>('/parents/me/children');
    return res.data;
  },
};
