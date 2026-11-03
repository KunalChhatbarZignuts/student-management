import apiClient from '@/lib/axios';
import {
  TeacherSubjectItem,
  TeacherSubjectAssignmentCreate,
  TeacherSubjectUpdate,
  TeacherSubjectTeacherItem,
  TeacherProfileWithSubjects,
  SubjectItem,
} from './types';

export const teacherSubjectKeys = {
  all: ['teacher-subjects'] as const,
  overview: (filters: Record<string, unknown>) => [...teacherSubjectKeys.all, 'overview', filters] as const,
  byTeacher: (teacherId: string, academicYearId?: string) =>
    [...teacherSubjectKeys.all, 'by-teacher', teacherId, academicYearId || 'all'] as const,
  bySubject: (subjectId: string, academicYearId?: string) =>
    [...teacherSubjectKeys.all, 'by-subject', subjectId, academicYearId || 'all'] as const,
  profile: (teacherId: string) => [...teacherSubjectKeys.all, 'profile', teacherId] as const,
  mySubjects: (academicYearId?: string) => ['teacher', 'my-subjects', academicYearId || 'all'] as const,
  myProfile: () => ['teacher', 'my-profile'] as const,
  subjects: () => ['admin', 'subjects'] as const,
};

export const teacherSubjectApi = {
  // Admin endpoints
  listOverview: async (params?: {
    teacher_id?: string;
    subject_id?: string;
    grade_id?: string;
    section_id?: string;
    academic_year_id?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<TeacherSubjectItem[]> => {
    const res = await apiClient.get<TeacherSubjectItem[]>('/admin/teacher-subjects', { params });
    return res.data;
  },

  assignSubjects: async (payload: TeacherSubjectAssignmentCreate): Promise<TeacherSubjectItem[]> => {
    const res = await apiClient.post<TeacherSubjectItem[]>('/admin/teacher-subjects', payload);
    return res.data;
  },

  getTeacherAssignments: async (teacherId: string, academicYearId?: string): Promise<TeacherSubjectItem[]> => {
    const res = await apiClient.get<TeacherSubjectItem[]>(`/admin/teacher-subjects/teachers/${teacherId}`, {
      params: academicYearId ? { academic_year_id: academicYearId } : undefined,
    });
    return res.data;
  },

  getTeachersForSubject: async (subjectId: string, academicYearId?: string): Promise<TeacherSubjectTeacherItem[]> => {
    const res = await apiClient.get<TeacherSubjectTeacherItem[]>(`/admin/teacher-subjects/subjects/${subjectId}/teachers`, {
      params: academicYearId ? { academic_year_id: academicYearId } : undefined,
    });
    return res.data;
  },

  getTeacherProfile: async (teacherId: string): Promise<TeacherProfileWithSubjects> => {
    const res = await apiClient.get<TeacherProfileWithSubjects>(`/admin/teacher-subjects/teachers/${teacherId}/profile`);
    return res.data;
  },

  updateAssignment: async (id: string, payload: TeacherSubjectUpdate): Promise<TeacherSubjectItem> => {
    const res = await apiClient.put<TeacherSubjectItem>(`/admin/teacher-subjects/${id}`, payload);
    return res.data;
  },

  deleteAssignment: async (id: string, hardDelete: boolean = false): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/admin/teacher-subjects/${id}`, {
      params: { hard_delete: hardDelete },
    });
    return res.data;
  },

  listSubjects: async (): Promise<SubjectItem[]> => {
    const res = await apiClient.get<{ items: SubjectItem[]; total: number }>('/admin/subjects', {
      params: { page: 1, size: 100 },
    });
    return res.data.items || [];
  },

  createSubject: async (payload: { name: string; code: string; department?: string }): Promise<SubjectItem> => {
    const res = await apiClient.post<SubjectItem>('/admin/subjects', payload);
    return res.data;
  },

  deleteSubject: async (subjectId: string): Promise<{ message: string; id: string }> => {
    const res = await apiClient.delete<{ message: string; id: string }>(`/admin/subjects/${subjectId}`);
    return res.data;
  },

  // Teacher self-service endpoints
  getMySubjects: async (academicYearId?: string): Promise<TeacherSubjectItem[]> => {
    const res = await apiClient.get<TeacherSubjectItem[]>('/teacher/my-subjects', {
      params: academicYearId ? { academic_year_id: academicYearId } : undefined,
    });
    return res.data;
  },

  getMyProfile: async (): Promise<TeacherProfileWithSubjects> => {
    const res = await apiClient.get<TeacherProfileWithSubjects>('/teacher/my-profile');
    return res.data;
  },
};

