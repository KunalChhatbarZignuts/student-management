import apiClient from '@/lib/axios';
import { TimetableDetail } from './types';

export const timetableKeys = {
  studentMy: ['timetable', 'student', 'me'] as const,
  parentChild: (childId: string) => ['timetable', 'parent', 'child', childId] as const,
};

export const timetableApi = {
  getStudentMyTimetable: async (): Promise<TimetableDetail> => {
    const res = await apiClient.get<TimetableDetail>('/student/timetable/me');
    return res.data;
  },

  getChildTimetable: async (childId: string): Promise<TimetableDetail> => {
    const res = await apiClient.get<TimetableDetail>(`/parent/children/${childId}/timetable`);
    return res.data;
  },
};

