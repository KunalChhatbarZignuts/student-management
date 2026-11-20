import { apiClient } from '@/lib/axios';
import {
  OnlineClass,
  OnlineClassListResponse,
  PreJoinInfo,
  MeetingTokenResponse,
} from './types';

export * from './types';

export const studentOnlineClassKeys = {
  all: ['student-online-classes'] as const,
  list: (status?: string) => [...studentOnlineClassKeys.all, 'list', status || 'all'] as const,
  preJoin: (classId: string) => [...studentOnlineClassKeys.all, 'pre-join', classId] as const,
  detail: (classId: string) => [...studentOnlineClassKeys.all, 'detail', classId] as const,
};

export const studentOnlineClassApi = {
  getClasses: async (status?: string, page = 1, size = 50): Promise<OnlineClassListResponse> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', String(page));
    params.append('size', String(size));
    const res = await apiClient.get<OnlineClassListResponse>(`/student/online-classes?${params.toString()}`);
    return res.data;
  },

  getPreJoinInfo: async (classId: string): Promise<PreJoinInfo> => {
    const res = await apiClient.get<PreJoinInfo>(`/student/online-classes/${classId}/pre-join`);
    return res.data;
  },

  getClassDetail: async (classId: string): Promise<OnlineClass> => {
    const res = await apiClient.get<OnlineClass>(`/student/online-classes/${classId}`);
    return res.data;
  },

  getToken: async (classId: string): Promise<MeetingTokenResponse> => {
    const res = await apiClient.post<MeetingTokenResponse>(`/student/online-classes/${classId}/token`);
    return res.data;
  },
};
