import apiClient from '@/lib/axios';
import {
  LinkedChildDetail,
  ParentProfile,
  ParentProfileUpdate,
  ParentNotificationItem,
  ChildTimetableResponse,
  ChildAssignmentsResponse,
} from './types';
import { AttendanceSummary, StudentMark, FeeInvoice } from '../academic/api';

export const parentKeys = {
  all: ['parents'] as const,
  profile: () => [...parentKeys.all, 'profile'] as const,
  children: () => [...parentKeys.all, 'children'] as const,
  childDetail: (studentId: string) => [...parentKeys.all, 'children', studentId] as const,
  attendance: (studentId: string) => [...parentKeys.all, 'children', studentId, 'attendance'] as const,
  marks: (studentId: string) => [...parentKeys.all, 'children', studentId, 'marks'] as const,
  fees: (studentId: string) => [...parentKeys.all, 'children', studentId, 'fees'] as const,
  timetable: (studentId: string) => [...parentKeys.all, 'children', studentId, 'timetable'] as const,
  assignments: (studentId: string) => [...parentKeys.all, 'children', studentId, 'assignments'] as const,
  notifications: () => [...parentKeys.all, 'notifications'] as const,
};

export const parentApi = {
  getMyProfile: async (): Promise<ParentProfile> => {
    const res = await apiClient.get<ParentProfile>('/parent/me');
    return res.data;
  },

  updateMyProfile: async (payload: ParentProfileUpdate): Promise<ParentProfile> => {
    const res = await apiClient.put<ParentProfile>('/parent/profile', payload);
    return res.data;
  },

  getMyChildren: async (): Promise<LinkedChildDetail[]> => {
    const res = await apiClient.get<LinkedChildDetail[]>('/parent/children');
    return res.data;
  },

  getChildDetail: async (studentId: string): Promise<LinkedChildDetail> => {
    const res = await apiClient.get<LinkedChildDetail>(`/parent/children/${studentId}`);
    return res.data;
  },

  getChildAttendance: async (studentId: string): Promise<AttendanceSummary> => {
    const res = await apiClient.get<AttendanceSummary>(`/parent/children/${studentId}/attendance`);
    return res.data;
  },

  getChildMarks: async (studentId: string): Promise<StudentMark[]> => {
    const res = await apiClient.get<StudentMark[]>(`/parent/children/${studentId}/academics`);
    return res.data;
  },

  getChildFees: async (studentId: string): Promise<FeeInvoice[]> => {
    const res = await apiClient.get<FeeInvoice[]>(`/parent/children/${studentId}/fees`);
    return res.data;
  },

  getChildTimetable: async (studentId: string): Promise<ChildTimetableResponse> => {
    const res = await apiClient.get<ChildTimetableResponse>(`/parent/children/${studentId}/timetable`);
    return res.data;
  },

  getChildAssignments: async (studentId: string): Promise<ChildAssignmentsResponse> => {
    const res = await apiClient.get<ChildAssignmentsResponse>(`/parent/children/${studentId}/assignments`);
    return res.data;
  },

  getNotifications: async (): Promise<ParentNotificationItem[]> => {
    const res = await apiClient.get<ParentNotificationItem[]>('/parent/notifications');
    return res.data;
  },
};
