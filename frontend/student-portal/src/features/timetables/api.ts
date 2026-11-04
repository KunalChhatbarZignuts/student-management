import apiClient from '@/lib/axios';
import { TimetableDetail } from './types';

export const timetableKeys = {
  studentMy: (date?: string) => ['timetable', 'student', 'me', date] as const,
  parentChild: (childId: string, date?: string) => ['timetable', 'parent', 'child', childId, date] as const,
};

export const timetableApi = {
  getStudentMyTimetable: async (date?: string): Promise<TimetableDetail> => {
    const res = await apiClient.get<TimetableDetail>('/student/timetable/me', {
      params: date ? { date } : {},
    });
    return res.data;
  },

  getChildTimetable: async (childId: string, date?: string): Promise<TimetableDetail> => {
    const res = await apiClient.get<TimetableDetail>(`/parent/children/${childId}/timetable`, {
      params: date ? { date } : {},
    });
    return res.data;
  },
};

