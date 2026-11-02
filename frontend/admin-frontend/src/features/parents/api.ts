import apiClient from '@/lib/axios';
import {
  LinkedChildDetail,
  LinkedParentDetail,
  PaginatedParentsResponse,
  ParentCreatePayload,
  ParentResponse,
  ParentUpdatePayload,
  ParentWithChildren,
  LinkChildPayload,
  UpdateRelationshipPayload,
} from './types';

export * from './types';

export const parentKeys = {
  all: ['parents'] as const,
  list: (filters?: Record<string, unknown>) => [...parentKeys.all, 'list', filters || {}] as const,
  detail: (id: string) => [...parentKeys.all, 'detail', id] as const,
  children: (id: string) => [...parentKeys.all, 'children', id] as const,
  studentParents: (studentId: string) => [...parentKeys.all, 'student-parents', studentId] as const,
};

export const adminParentApi = {
  listParents: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<PaginatedParentsResponse> => {
    const res = await apiClient.get<PaginatedParentsResponse>('/admin/parents', { params });
    // In case backend returned array directly in legacy format
    if (Array.isArray(res.data)) {
      return {
        items: res.data,
        total: res.data.length,
        skip: params?.skip || 0,
        limit: params?.limit || 50,
      };
    }
    return res.data;
  },

  getParent: async (parentId: string): Promise<ParentWithChildren> => {
    const res = await apiClient.get<ParentWithChildren>(`/admin/parents/${parentId}`);
    return res.data;
  },

  createParent: async (payload: ParentCreatePayload): Promise<ParentResponse> => {
    const res = await apiClient.post<ParentResponse>('/admin/parents', payload);
    return res.data;
  },

  updateParent: async (parentId: string, payload: ParentUpdatePayload) => {
    const res = await apiClient.put(`/admin/parents/${parentId}`, payload);
    return res.data;
  },

  updateParentStatus: async (parentId: string, status: 'active' | 'suspended' | 'deactivated') => {
    const res = await apiClient.patch(`/admin/parents/${parentId}/status`, { status });
    return res.data;
  },

  resendInvite: async (parentId: string) => {
    const res = await apiClient.post(`/admin/parents/${parentId}/resend-invite`);
    return res.data;
  },

  getParentChildren: async (parentId: string): Promise<LinkedChildDetail[]> => {
    const res = await apiClient.get<LinkedChildDetail[]>(`/admin/parents/${parentId}/children`);
    return res.data;
  },

  linkChild: async (parentId: string, payload: LinkChildPayload) => {
    const res = await apiClient.post(`/admin/parents/${parentId}/children`, payload);
    return res.data;
  },

  // Legacy helper
  linkStudent: async (parentId: string, studentId: string) => {
    const res = await apiClient.post(`/admin/parents/${parentId}/link-student/${studentId}`);
    return res.data;
  },

  unlinkChild: async (parentId: string, studentId: string) => {
    const res = await apiClient.delete(`/admin/parents/${parentId}/children/${studentId}`);
    return res.data;
  },

  unlinkStudent: async (parentId: string, studentId: string) => {
    const res = await apiClient.delete(`/admin/parents/${parentId}/children/${studentId}`);
    return res.data;
  },

  updateRelationship: async (parentId: string, studentId: string, payload: UpdateRelationshipPayload) => {
    const res = await apiClient.put(`/admin/parents/${parentId}/children/${studentId}`, payload);
    return res.data;
  },

  getStudentParents: async (studentId: string): Promise<LinkedParentDetail[]> => {
    const res = await apiClient.get<LinkedParentDetail[]>(`/admin/students/${studentId}/parents`);
    return res.data;
  },
};
