import apiClient from '@/lib/axios';
import {
  CreateOnlineClassPayload,
  MeetingTokenResponse,
  OnlineClass,
  OnlineClassDetail,
  OnlineClassListResponse,
  OnlineClassStats,
  UpdateOnlineClassPayload,
} from './types';

export * from './types';

export const onlineClassroomKeys = {
  all: ['online-classroom'] as const,
  list: (filters?: Record<string, unknown>) => [...onlineClassroomKeys.all, 'list', filters || {}] as const,
  stats: () => [...onlineClassroomKeys.all, 'stats'] as const,
  detail: (id: string) => [...onlineClassroomKeys.all, 'detail', id] as const,
  students: (params?: { search?: string; grade_id?: string; section_id?: string }) => [...onlineClassroomKeys.all, 'students', params || {}] as const,
  adminStats: () => [...onlineClassroomKeys.all, 'admin-stats'] as const,
  adminClasses: (params?: Record<string, unknown>) => [...onlineClassroomKeys.all, 'admin-classes', params || {}] as const,
};

export const teacherOnlineClassApi = {
  listClasses: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<OnlineClassListResponse> => {
    const res = await apiClient.get<OnlineClassListResponse>('/teacher/online-classes', { params });
    return res.data;
  },

  getStats: async (): Promise<OnlineClassStats> => {
    const res = await apiClient.get<OnlineClassStats>('/teacher/online-classes/stats');
    return res.data;
  },

  getClassDetail: async (id: string): Promise<OnlineClassDetail> => {
    const res = await apiClient.get<OnlineClassDetail>(`/teacher/online-classes/${id}`);
    return res.data;
  },

  createClass: async (payload: CreateOnlineClassPayload): Promise<OnlineClass> => {
    const res = await apiClient.post<OnlineClass>('/teacher/online-classes', payload);
    return res.data;
  },

  updateClass: async (id: string, payload: UpdateOnlineClassPayload): Promise<OnlineClass> => {
    const res = await apiClient.put<OnlineClass>(`/teacher/online-classes/${id}`, payload);
    return res.data;
  },

  cancelClass: async (id: string): Promise<OnlineClass> => {
    const res = await apiClient.delete<OnlineClass>(`/teacher/online-classes/${id}`);
    return res.data;
  },

  startClass: async (id: string): Promise<OnlineClass> => {
    const res = await apiClient.post<OnlineClass>(`/teacher/online-classes/${id}/start`);
    return res.data;
  },

  endClass: async (id: string): Promise<OnlineClass> => {
    const res = await apiClient.post<OnlineClass>(`/teacher/online-classes/${id}/end`);
    return res.data;
  },

  getTeacherToken: async (id: string): Promise<MeetingTokenResponse> => {
    const res = await apiClient.post<MeetingTokenResponse>(`/teacher/online-classes/${id}/token`);
    return res.data;
  },

  searchStudents: async (params?: { search?: string; grade_id?: string; section_id?: string }): Promise<Array<{ id: string; student_code: string; first_name: string; last_name: string; class_name?: string }>> => {
    const res = await apiClient.get('/teacher/online-classes/students', {
      params: {
        search: params?.search || undefined,
        grade_id: params?.grade_id || undefined,
        section_id: params?.section_id || undefined,
        limit: 100,
      },
    });
    return res.data?.items || [];
  },
};

export const adminOnlineClassApi = {
  getClassDetail: async (id: string): Promise<OnlineClassDetail> => {
    const res = await apiClient.get<OnlineClassDetail>(`/admin/online-classes/${id}`);
    return res.data;
  },

  getStats: async (): Promise<OnlineClassStats> => {
    const res = await apiClient.get<OnlineClassStats>('/admin/online-classes/stats');
    return res.data;
  },

  listClasses: async (params?: {
    status?: string;
    teacher_id?: string;
    page?: number;
    size?: number;
  }): Promise<OnlineClassListResponse> => {
    const res = await apiClient.get<OnlineClassListResponse>('/admin/online-classes', { params });
    return res.data;
  },

  getObserverToken: async (classId: string): Promise<MeetingTokenResponse> => {
    const res = await apiClient.post<MeetingTokenResponse>(`/admin/online-classes/${classId}/observer-token`);
    return res.data;
  },

  updatePermissions: async (
    classId: string,
    permissions: {
      allow_student_mic?: boolean;
      allow_student_cam?: boolean;
      allow_student_chat?: boolean;
      allow_student_whiteboard?: boolean;
    }
  ): Promise<OnlineClass> => {
    const res = await apiClient.patch<OnlineClass>(`/admin/online-classes/${classId}/permissions`, permissions);
    return res.data;
  },

  terminateClass: async (classId: string): Promise<OnlineClass> => {
    const res = await apiClient.post<OnlineClass>(`/admin/online-classes/${classId}/terminate`);
    return res.data;
  },

  createClass: async (data: any): Promise<OnlineClass> => {
    const res = await apiClient.post<OnlineClass>('/admin/online-classes', data);
    return res.data;
  },
};
