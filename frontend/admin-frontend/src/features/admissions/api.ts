import apiClient from '@/lib/axios';
import {
  AdmissionCreateRequest,
  AdmissionResponse,
  PaginatedAdmissionsResponse,
} from './types';

export * from './types';

export const admissionKeys = {
  all: ['admissions'] as const,
  lists: () => [...admissionKeys.all, 'list'] as const,
  list: (params?: unknown) => [...admissionKeys.lists(), params] as const,
  detail: (id: string) => [...admissionKeys.all, 'detail', id] as const,
};

export interface SectionTeacherResponse {
  section_id: string;
  section_name: string;
  class_teacher: {
    teacher_id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  } | null;
}

export const adminAdmissionApi = {
  createAdmission: async (payload: AdmissionCreateRequest): Promise<AdmissionResponse> => {
    const res = await apiClient.post<AdmissionResponse>('/admin/admissions', payload);
    return res.data;
  },

  listAdmissions: async (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    grade_id?: string;
    status?: string;
  }): Promise<PaginatedAdmissionsResponse> => {
    const res = await apiClient.get<PaginatedAdmissionsResponse>('/admin/admissions', { params });
    return res.data;
  },

  getAdmission: async (admissionId: string): Promise<AdmissionResponse> => {
    const res = await apiClient.get<AdmissionResponse>(`/admin/admissions/${admissionId}`);
    return res.data;
  },

  getSectionTeacher: async (sectionId: string): Promise<SectionTeacherResponse> => {
    const res = await apiClient.get<SectionTeacherResponse>(`/admin/sections/${sectionId}/teacher`);
    return res.data;
  },
};

