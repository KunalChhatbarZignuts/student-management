import { apiClient } from '@/lib/axios';
import { ExaminationSchedule, StudentResultResponse } from './types';

export const examinationsApi = {
  // Student Portal
  getStudentUpcomingExams: async (): Promise<ExaminationSchedule[]> => {
    const res = await apiClient.get<ExaminationSchedule[]>('/students/me/examinations/upcoming');
    return res.data;
  },

  getStudentPastExams: async (): Promise<ExaminationSchedule[]> => {
    const res = await apiClient.get<ExaminationSchedule[]>('/students/me/examinations/past');
    return res.data;
  },

  getStudentResults: async (): Promise<StudentResultResponse[]> => {
    const res = await apiClient.get<StudentResultResponse[]>('/students/me/examinations/results');
    return res.data;
  },

  downloadStudentReportCard: async (examinationId: string, filename: string): Promise<void> => {
    const res = await apiClient.get(`/students/me/examinations/${examinationId}/report-card/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Parent Portal
  getParentChildUpcomingExams: async (childId: string): Promise<ExaminationSchedule[]> => {
    const res = await apiClient.get<ExaminationSchedule[]>(`/parent/children/${childId}/examinations/upcoming`);
    return res.data;
  },

  getParentChildPastExams: async (childId: string): Promise<ExaminationSchedule[]> => {
    const res = await apiClient.get<ExaminationSchedule[]>(`/parent/children/${childId}/examinations/past`);
    return res.data;
  },

  getParentChildResults: async (childId: string): Promise<StudentResultResponse[]> => {
    const res = await apiClient.get<StudentResultResponse[]>(`/parent/children/${childId}/examinations/results`);
    return res.data;
  },

  downloadParentChildReportCard: async (childId: string, examinationId: string, filename: string): Promise<void> => {
    const res = await apiClient.get(`/parent/children/${childId}/examinations/${examinationId}/report-card/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

