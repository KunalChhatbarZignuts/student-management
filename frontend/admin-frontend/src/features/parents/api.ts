import apiClient from '@/lib/axios';

export const adminParentApi = {
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
};

