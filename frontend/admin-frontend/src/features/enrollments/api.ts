import { apiClient } from '@/lib/axios';
import {
  BulkEnrollmentRequest,
  BulkEnrollmentResponse,
  EnhancedEnrollmentHistoryItem,
  EnrollmentDashboardMetrics,
  PromotionExecuteRequest,
  PromotionExecuteResponse,
  PromotionPreviewRequest,
  PromotionPreviewResponse,
  StudentTransferCreate,
  StudentTransferRecordResponse,
  UnassignedStudentItem,
} from './types';

export const enrollmentsApi = {
  getDashboardMetrics: async (academicYearId?: string): Promise<EnrollmentDashboardMetrics> => {
    const res = await apiClient.get<EnrollmentDashboardMetrics>('/enrollments/dashboard', {
      params: academicYearId ? { academic_year_id: academicYearId } : {},
    });
    return res.data;
  },

  getUnassignedStudents: async (academicYearId?: string): Promise<UnassignedStudentItem[]> => {
    const res = await apiClient.get<UnassignedStudentItem[]>('/enrollments/unassigned', {
      params: academicYearId ? { academic_year_id: academicYearId } : {},
    });
    return res.data;
  },

  bulkEnroll: async (payload: BulkEnrollmentRequest): Promise<BulkEnrollmentResponse> => {
    const res = await apiClient.post<BulkEnrollmentResponse>('/enrollments/bulk-enroll', payload);
    return res.data;
  },

  transferStudent: async (payload: StudentTransferCreate): Promise<StudentTransferRecordResponse> => {
    const res = await apiClient.post<StudentTransferRecordResponse>('/enrollments/transfer', payload);
    return res.data;
  },

  getTransferRecords: async (academicYearId?: string, studentId?: string): Promise<StudentTransferRecordResponse[]> => {
    const res = await apiClient.get<StudentTransferRecordResponse[]>('/enrollments/transfers', {
      params: {
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
        ...(studentId ? { student_id: studentId } : {}),
      },
    });
    return res.data;
  },

  previewPromotions: async (payload: PromotionPreviewRequest): Promise<PromotionPreviewResponse> => {
    const res = await apiClient.post<PromotionPreviewResponse>('/enrollments/promotions/preview', payload);
    return res.data;
  },

  executePromotions: async (payload: PromotionExecuteRequest): Promise<PromotionExecuteResponse> => {
    const res = await apiClient.post<PromotionExecuteResponse>('/enrollments/promotions/execute', payload);
    return res.data;
  },

  getStudentEnrollmentHistory: async (studentId: string): Promise<EnhancedEnrollmentHistoryItem[]> => {
    const res = await apiClient.get<EnhancedEnrollmentHistoryItem[]>(`/enrollments/students/${studentId}/history`);
    return res.data;
  },
};

