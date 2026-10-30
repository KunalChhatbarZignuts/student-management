import apiClient from '@/lib/axios';

export interface ApplicationItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  dob: string;
  department: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const applicationKeys = {
  all: ['applications'] as const,
  list: () => [...applicationKeys.all, 'list'] as const,
};

export const adminApplicationApi = {
  listApplications: async (): Promise<ApplicationItem[]> => {
    const res = await apiClient.get<ApplicationItem[]>('/admin/applications');
    return res.data;
  },

  approveApplication: async (id: string) => {
    const res = await apiClient.post(`/admin/applications/${id}/approve`);
    return res.data;
  },

  rejectApplication: async (id: string) => {
    const res = await apiClient.post(`/admin/applications/${id}/reject`);
    return res.data;
  },
};

