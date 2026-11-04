import apiClient from '@/lib/axios';
import {
  LeaveApplicationItem,
  LeaveListResponse,
  LeaveMonitoringFilters,
  TeacherApprovePayload,
  TeacherRejectPayload,
} from './types';

export const leaveKeys = {
  all: ['leaves'] as const,
  teacherList: (status?: string) => ['leaves', 'teacher', status] as const,
  adminMonitoring: (filters: LeaveMonitoringFilters) => ['leaves', 'admin', filters] as const,
};

export const leaveApi = {
  // Teacher endpoints
  getTeacherAssignedLeaves: async (status?: string): Promise<LeaveListResponse> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const res = await apiClient.get<LeaveListResponse>('/leaves/teacher/assigned', { params });
    return res.data;
  },

  approveLeave: async (id: string, payload: TeacherApprovePayload): Promise<LeaveApplicationItem> => {
    const res = await apiClient.post<LeaveApplicationItem>(`/leaves/teacher/${id}/approve`, payload);
    return res.data;
  },

  rejectLeave: async (id: string, payload: TeacherRejectPayload): Promise<LeaveApplicationItem> => {
    const res = await apiClient.post<LeaveApplicationItem>(`/leaves/teacher/${id}/reject`, payload);
    return res.data;
  },

  // Admin monitoring
  getAdminMonitoringLeaves: async (filters: LeaveMonitoringFilters): Promise<LeaveListResponse> => {
    const res = await apiClient.get<LeaveListResponse>('/leaves/admin/monitoring', { params: filters });
    return res.data;
  },
};

