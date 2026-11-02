import apiClient from '@/lib/axios';
import {
  AcademicYear,
  Grade,
  GradeCreatePayload,
  GradeUpdatePayload,
  GradeListResponse,
  GradeDetailResponse,
  Section,
  SectionCreatePayload,
  SectionUpdatePayload,
  SectionListResponse,
  SectionStudentsResponse,
  TeacherAssignmentItem,
  StudentEnrollPayload,
  StudentTransferPayload,
  StudentPromotePayload,
  StudentEnrollmentHistoryItem,
} from './types';

export const gradeKeys = {
  all: ['grades'] as const,
  list: (filters: Record<string, unknown>) => [...gradeKeys.all, 'list', filters] as const,
  detail: (id: string) => [...gradeKeys.all, 'detail', id] as const,
  academicYears: ['academic-years'] as const,
  sections: (gradeId?: string) => ['sections', gradeId || 'all'] as const,
  sectionStudents: (sectionId: string) => ['section-students', sectionId] as const,
  studentEnrollments: (studentId: string) => ['student-enrollments', studentId] as const,
};

export const adminGradeApi = {
  listAcademicYears: async (): Promise<AcademicYear[]> => {
    const res = await apiClient.get<AcademicYear[]>('/admin/academic-years');
    return res.data;
  },

  listGrades: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    academic_year_id?: string;
    status?: string;
  }): Promise<GradeListResponse> => {
    const res = await apiClient.get<GradeListResponse>('/admin/grades', { params });
    return res.data;
  },

  getGrade: async (id: string): Promise<GradeDetailResponse> => {
    const res = await apiClient.get<GradeDetailResponse>(`/admin/grades/${id}`);
    return res.data;
  },

  createGrade: async (payload: GradeCreatePayload): Promise<Grade> => {
    const res = await apiClient.post<Grade>('/admin/grades', payload);
    return res.data;
  },

  updateGrade: async (id: string, payload: GradeUpdatePayload): Promise<Grade> => {
    const res = await apiClient.put<Grade>(`/admin/grades/${id}`, payload);
    return res.data;
  },

  updateGradeStatus: async (id: string, status: 'active' | 'inactive'): Promise<Grade> => {
    const res = await apiClient.patch<Grade>(`/admin/grades/${id}/status`, { status });
    return res.data;
  },

  getGradeSections: async (id: string): Promise<Section[]> => {
    const res = await apiClient.get<SectionListResponse | Section[]>(`/admin/grades/${id}/sections`);
    if (res.data && 'items' in (res.data as any) && Array.isArray((res.data as any).items)) {
      return (res.data as any).items;
    }
    return Array.isArray(res.data) ? res.data : [];
  },

  listSections: async (params?: {
    page?: number;
    size?: number;
    grade_id?: string;
    academic_year_id?: string;
    status?: string;
    search?: string;
  }): Promise<SectionListResponse> => {
    const res = await apiClient.get<SectionListResponse>('/admin/sections', { params });
    return res.data;
  },

  getSection: async (id: string): Promise<Section> => {
    const res = await apiClient.get<Section>(`/admin/sections/${id}`);
    return res.data;
  },

  createSection: async (payload: SectionCreatePayload): Promise<Section> => {
    const res = await apiClient.post<Section>('/admin/sections', payload);
    return res.data;
  },

  updateSection: async (id: string, payload: SectionUpdatePayload): Promise<Section> => {
    const res = await apiClient.put<Section>(`/admin/sections/${id}`, payload);
    return res.data;
  },

  updateSectionStatus: async (id: string, status: 'active' | 'inactive'): Promise<Section> => {
    const res = await apiClient.patch<Section>(`/admin/sections/${id}/status`, { status });
    return res.data;
  },

  assignTeacher: async (sectionId: string, teacherId: string): Promise<TeacherAssignmentItem> => {
    const res = await apiClient.post<TeacherAssignmentItem>(`/admin/sections/${sectionId}/assign-teacher`, {
      teacher_id: teacherId,
    });
    return res.data;
  },

  removeTeacher: async (sectionId: string): Promise<void> => {
    await apiClient.delete(`/admin/sections/${sectionId}/teacher`);
  },

  getSectionTeacher: async (sectionId: string): Promise<TeacherAssignmentItem | null> => {
    try {
      const res = await apiClient.get<TeacherAssignmentItem>(`/admin/sections/${sectionId}/teacher`);
      return res.data;
    } catch {
      return null;
    }
  },

  getSectionStudents: async (sectionId: string): Promise<SectionStudentsResponse> => {
    const res = await apiClient.get<SectionStudentsResponse>(`/admin/sections/${sectionId}/students`);
    return res.data;
  },

  enrollStudent: async (studentId: string, payload: StudentEnrollPayload) => {
    const res = await apiClient.post(`/admin/students/${studentId}/enroll`, payload);
    return res.data;
  },

  transferStudent: async (studentId: string, payload: StudentTransferPayload) => {
    const res = await apiClient.post(`/admin/students/${studentId}/transfer`, payload);
    return res.data;
  },

  promoteStudent: async (studentId: string, payload: StudentPromotePayload) => {
    const res = await apiClient.post(`/admin/students/${studentId}/promote`, payload);
    return res.data;
  },

  getStudentEnrollments: async (studentId: string): Promise<StudentEnrollmentHistoryItem[]> => {
    const res = await apiClient.get<StudentEnrollmentHistoryItem[]>(`/admin/students/${studentId}/enrollments`);
    return res.data;
  },
};

