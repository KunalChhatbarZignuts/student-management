import apiClient from '@/lib/axios';

export interface LinkedStudentSummary {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  class_name: string;
  section: string;
}

export interface ParentWithChildren {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  children: LinkedStudentSummary[];
  created_at: string;
}

export const parentKeys = {
  all: ['parents'] as const,
  list: () => [...parentKeys.all, 'list'] as const,
};

export const adminParentApi = {
  listParents: async (): Promise<ParentWithChildren[]> => {
    const res = await apiClient.get<ParentWithChildren[]>('/admin/parents');
    return res.data;
  },

  createParent: async (payload: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }) => {
    const res = await apiClient.post('/admin/parents', payload);
    return res.data;
  },

  linkStudent: async (parentId: string, studentId: string) => {
    const res = await apiClient.post(`/admin/parents/${parentId}/link-student/${studentId}`);
    return res.data;
  },

  unlinkStudent: async (parentId: string, studentId: string) => {
    const res = await apiClient.delete(`/admin/parents/${parentId}/link-student/${studentId}`);
    return res.data;
  },
};
