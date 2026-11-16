import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
  CreateExaminationPayload,
  CreateSchedulePayload,
  Examination,
  ExaminationDashboardMetrics,
  ExaminationSchedule,
  GradingScale,
  MarksBulkSavePayload,
  ScheduleRosterResponse,
} from './types';

export const examinationsApi = {
  // Admin Endpoints
  getDashboardMetrics: async (): Promise<ExaminationDashboardMetrics> => {
    const res = await apiClient.get<ExaminationDashboardMetrics>('/admin/examinations/dashboard-metrics');
    return res.data;
  },

  listExaminations: async (params?: {
    academic_year_id?: string;
    term?: string;
    status?: string;
  }): Promise<Examination[]> => {
    const res = await apiClient.get<Examination[]>('/admin/examinations', { params });
    return res.data;
  },

  getExamination: async (id: string): Promise<Examination> => {
    const res = await apiClient.get<Examination>(`/admin/examinations/${id}`);
    return res.data;
  },

  createExamination: async (payload: CreateExaminationPayload): Promise<Examination> => {
    const res = await apiClient.post<Examination>('/admin/examinations', payload);
    return res.data;
  },

  updateExamination: async (id: string, payload: Partial<CreateExaminationPayload> & { status?: string }): Promise<Examination> => {
    const res = await apiClient.put<Examination>(`/admin/examinations/${id}`, payload);
    return res.data;
  },

  deleteExamination: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/examinations/${id}`);
  },

  listSchedules: async (examinationId: string, gradeId?: string, sectionId?: string): Promise<ExaminationSchedule[]> => {
    const res = await apiClient.get<ExaminationSchedule[]>(`/admin/examinations/${examinationId}/schedules`, {
      params: { grade_id: gradeId, section_id: sectionId },
    });
    return res.data;
  },

  createSchedule: async (examinationId: string, payload: CreateSchedulePayload): Promise<ExaminationSchedule> => {
    const res = await apiClient.post<ExaminationSchedule>(`/admin/examinations/${examinationId}/schedules`, payload);
    return res.data;
  },

  updateSchedule: async (scheduleId: string, payload: Partial<CreateSchedulePayload>): Promise<ExaminationSchedule> => {
    const res = await apiClient.put<ExaminationSchedule>(`/admin/examinations/schedules/${scheduleId}`, payload);
    return res.data;
  },

  deleteSchedule: async (scheduleId: string): Promise<void> => {
    await apiClient.delete(`/admin/examinations/schedules/${scheduleId}`);
  },

  publishResults: async (examinationId: string, sectionId?: string): Promise<{ message: string; published_count: number }> => {
    const res = await apiClient.post<{ message: string; published_count: number }>(
      `/admin/examinations/${examinationId}/publish-results`,
      { section_id: sectionId || null }
    );
    return res.data;
  },

  unpublishResults: async (examinationId: string, sectionId?: string): Promise<{ message: string; unpublished_count: number }> => {
    const res = await apiClient.post<{ message: string; unpublished_count: number }>(
      `/admin/examinations/${examinationId}/unpublish-results`,
      { section_id: sectionId || null }
    );
    return res.data;
  },

  getGradingScales: async (): Promise<GradingScale[]> => {
    const res = await apiClient.get<GradingScale[]>('/admin/grading-scales');
    return res.data;
  },

  // Teacher Endpoints
  getTeacherExaminations: async (): Promise<ExaminationSchedule[]> => {
    const res = await apiClient.get<ExaminationSchedule[]>('/teacher/examinations');
    return res.data;
  },

  getScheduleRoster: async (scheduleId: string): Promise<ScheduleRosterResponse> => {
    const role = useAuthStore.getState().user?.role;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const endpoint = isAdmin
      ? `/admin/examinations/schedules/${scheduleId}/roster`
      : `/teacher/examinations/schedules/${scheduleId}/roster`;
    const res = await apiClient.get<ScheduleRosterResponse>(endpoint);
    return res.data;
  },

  saveDraftMarks: async (scheduleId: string, payload: MarksBulkSavePayload): Promise<ScheduleRosterResponse> => {
    const role = useAuthStore.getState().user?.role;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const endpoint = isAdmin
      ? `/admin/examinations/schedules/${scheduleId}/marks/draft`
      : `/teacher/examinations/schedules/${scheduleId}/marks/draft`;
    const res = await apiClient.post<ScheduleRosterResponse>(endpoint, payload);
    return res.data;
  },

  submitMarks: async (scheduleId: string, payload: MarksBulkSavePayload): Promise<ScheduleRosterResponse> => {
    const role = useAuthStore.getState().user?.role;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const endpoint = isAdmin
      ? `/admin/examinations/schedules/${scheduleId}/marks/submit`
      : `/teacher/examinations/schedules/${scheduleId}/marks/submit`;
    const res = await apiClient.post<ScheduleRosterResponse>(endpoint, payload);
    return res.data;
  },
};

