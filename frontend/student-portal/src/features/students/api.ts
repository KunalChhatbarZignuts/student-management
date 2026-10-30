import apiClient from '@/lib/axios';
import { StudentResponse } from './types';

export const studentKeys = {
  all: ['students'] as const,
  me: () => [...studentKeys.all, 'me'] as const,
};

export const studentApi = {
  getMyProfile: async (): Promise<StudentResponse> => {
    const res = await apiClient.get<StudentResponse>('/students/me');
    return res.data;
  },
};
