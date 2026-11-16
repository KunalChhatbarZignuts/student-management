import apiClient from '@/lib/axios';
import {
  LeaveApplicationItem,
  ParentLeaveApplyPayload,
  StudentLeaveApplyPayload,
} from './types';

export const leaveKeys = {
  all: ['leaves'] as const,
  studentList: () => ['leaves', 'student'] as const,
  parentList: (childId?: string) => ['leaves', 'parent', childId] as const,
};

export const leaveApi = {
  // Student
  applyStudentLeave: async (payload: StudentLeaveApplyPayload): Promise<LeaveApplicationItem> => {
    const res = await apiClient.post<LeaveApplicationItem>('/leaves/student/apply', payload);
    return res.data;
  },

  getMyLeaveApplications: async (): Promise<LeaveApplicationItem[]> => {
    const res = await apiClient.get<LeaveApplicationItem[]>('/leaves/student/my-applications');
    return res.data;
  },

  // Parent
  applyParentLeave: async (payload: ParentLeaveApplyPayload): Promise<LeaveApplicationItem> => {
    const res = await apiClient.post<LeaveApplicationItem>('/leaves/parent/apply', payload);
    return res.data;
  },

  getChildLeaveApplications: async (childId?: string): Promise<LeaveApplicationItem[]> => {
    const params = childId ? { student_id: childId } : {};
    const res = await apiClient.get<LeaveApplicationItem[]>('/leaves/parent/child-applications', { params });
    return res.data;
  },
};

