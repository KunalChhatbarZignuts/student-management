import { apiClient } from '@/lib/axios';
import {
  AdminAttendanceOverviewResponse,
  AdminAttendanceRecordUpdatePayload,
  AssignedSectionItem,
  AttendanceAuditItemResponse,
  AttendanceRecordItem,
  AttendanceSessionResponse,
  SectionAttendanceCreatePayload,
  SectionRosterStudentItem,
  StudentAttendanceHistoryResponse,
} from './types';

export const attendanceApi = {
  // Teacher endpoints
  getTeacherAssignedSections: async (): Promise<AssignedSectionItem[]> => {
    const res = await apiClient.get<AssignedSectionItem[]>('/teacher/attendance/sections');
    return res.data;
  },

  getSectionRoster: async (sectionId: string): Promise<SectionRosterStudentItem[]> => {
    const res = await apiClient.get<SectionRosterStudentItem[]>(
      `/teacher/attendance/sections/${sectionId}/roster`
    );
    return res.data;
  },

  getSectionAttendanceSession: async (
    sectionId: string,
    date: string,
    period: number = 1
  ): Promise<AttendanceSessionResponse | null> => {
    const res = await apiClient.get<AttendanceSessionResponse | null>(
      `/teacher/attendance/sections/${sectionId}`,
      { params: { date, period } }
    );
    return res.data;
  },

  markSectionAttendance: async (
    sectionId: string,
    payload: SectionAttendanceCreatePayload
  ): Promise<AttendanceSessionResponse> => {
    const res = await apiClient.post<AttendanceSessionResponse>(
      `/teacher/attendance/sections/${sectionId}`,
      payload
    );
    return res.data;
  },

  getSectionHistory: async (
    sectionId: string,
    limit: number = 30
  ): Promise<AttendanceSessionResponse[]> => {
    const res = await apiClient.get<AttendanceSessionResponse[]>(
      `/teacher/attendance/sections/${sectionId}/history`,
      { params: { limit } }
    );
    return res.data;
  },

  // Admin endpoints
  getAdminDailyOverview: async (params: {
    date: string;
    academic_year_id?: string;
    grade_id?: string;
    search?: string;
  }): Promise<AdminAttendanceOverviewResponse> => {
    const res = await apiClient.get<AdminAttendanceOverviewResponse>(
      '/admin/attendance/overview',
      { params }
    );
    return res.data;
  },

  getAdminSectionRoster: async (sectionId: string): Promise<SectionRosterStudentItem[]> => {
    const res = await apiClient.get<SectionRosterStudentItem[]>(
      `/admin/attendance/sections/${sectionId}/roster`
    );
    return res.data;
  },

  getAdminSectionAttendanceSession: async (
    sectionId: string,
    date: string,
    period: number = 1
  ): Promise<AttendanceSessionResponse | null> => {
    const res = await apiClient.get<AttendanceSessionResponse | null>(
      `/admin/attendance/sections/${sectionId}`,
      { params: { date, period } }
    );
    return res.data;
  },

  markAdminSectionAttendance: async (
    sectionId: string,
    payload: SectionAttendanceCreatePayload
  ): Promise<AttendanceSessionResponse> => {
    const res = await apiClient.post<AttendanceSessionResponse>(
      `/admin/attendance/sections/${sectionId}`,
      payload
    );
    return res.data;
  },

  getAdminSectionHistory: async (
    sectionId: string,
    limit: number = 30
  ): Promise<AttendanceSessionResponse[]> => {
    const res = await apiClient.get<AttendanceSessionResponse[]>(
      `/admin/attendance/sections/${sectionId}/history`,
      { params: { limit } }
    );
    return res.data;
  },

  getStudentAttendanceHistory: async (
    studentId: string,
    academicYearId?: string
  ): Promise<StudentAttendanceHistoryResponse> => {
    const res = await apiClient.get<StudentAttendanceHistoryResponse>(
      `/admin/attendance/students/${studentId}`,
      { params: academicYearId ? { academic_year_id: academicYearId } : undefined }
    );
    return res.data;
  },

  editAttendanceRecord: async (
    recordId: string,
    payload: AdminAttendanceRecordUpdatePayload
  ): Promise<AttendanceRecordItem> => {
    const res = await apiClient.put<AttendanceRecordItem>(
      `/admin/attendance/records/${recordId}`,
      payload
    );
    return res.data;
  },

  getAuditHistory: async (params?: {
    section_id?: string;
    date?: string;
  }): Promise<AttendanceAuditItemResponse[]> => {
    const res = await apiClient.get<AttendanceAuditItemResponse[]>(
      '/admin/attendance/audit-history',
      { params }
    );
    return res.data;
  },
};
