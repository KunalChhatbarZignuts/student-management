import apiClient from '@/lib/axios';
import {
  Shift,
  ShiftCreatePayload,
  Period,
  PeriodCreatePayload,
  TimetableDetail,
  SaveDraftPayload,
  ClashValidationResult,
  TeacherPersonalSchedule,
} from './types';

export const timetableKeys = {
  shifts: ['shifts'] as const,
  shiftPeriods: (shiftId: string) => ['shifts', shiftId, 'periods'] as const,
  classTimetable: (sectionId: string, date?: string) => ['timetable', 'class', sectionId, date] as const,
  teacherPersonal: (academicYearId?: string, date?: string) => ['timetable', 'teacher-personal', academicYearId, date] as const,
  teacherGrade: (sectionId: string, date?: string) => ['timetable', 'teacher-grade', sectionId, date] as const,
};

export const timetableApi = {
  // Shifts & Periods
  listShifts: async (): Promise<Shift[]> => {
    const res = await apiClient.get<Shift[]>('/admin/shifts');
    return res.data;
  },

  createShift: async (data: ShiftCreatePayload): Promise<Shift> => {
    const res = await apiClient.post<Shift>('/admin/shifts', data);
    return res.data;
  },

  addPeriod: async (shiftId: string, data: PeriodCreatePayload): Promise<Period> => {
    const res = await apiClient.post<Period>(`/admin/shifts/${shiftId}/periods`, data);
    return res.data;
  },

  updatePeriod: async (
    shiftId: string,
    periodId: string,
    data: Partial<PeriodCreatePayload>
  ): Promise<Period> => {
    const res = await apiClient.put<Period>(`/admin/shifts/${shiftId}/periods/${periodId}`, data);
    return res.data;
  },

  assignShiftToGrade: async (gradeId: string, shiftId: string | null): Promise<any> => {
    const res = await apiClient.put(`/admin/grades/${gradeId}/shift`, { shift_id: shiftId });
    return res.data;
  },

  assignGradesToShift: async (shiftId: string, gradeIds: string[]): Promise<Shift> => {
    const res = await apiClient.post<Shift>(`/admin/shifts/${shiftId}/assign-grades`, {
      grade_ids: gradeIds,
    });
    return res.data;
  },

  // Timetable Class Management
  getClassTimetable: async (
    sectionId: string,
    academicYearId?: string,
    date?: string
  ): Promise<TimetableDetail | null> => {
    try {
      const res = await apiClient.get<TimetableDetail>('/admin/timetables', {
        params: {
          section_id: sectionId,
          ...(academicYearId ? { academic_year_id: academicYearId } : {}),
          ...(date ? { date } : {}),
        },
      });
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  validateClashes: async (payload: SaveDraftPayload): Promise<ClashValidationResult> => {
    const res = await apiClient.post<ClashValidationResult>(
      '/admin/timetables/validate-clashes',
      payload
    );
    return res.data;
  },

  saveDraft: async (payload: SaveDraftPayload): Promise<TimetableDetail> => {
    const res = await apiClient.post<TimetableDetail>('/admin/timetables/save-draft', payload);
    return res.data;
  },

  publish: async (timetableId: string): Promise<TimetableDetail> => {
    const res = await apiClient.post<TimetableDetail>(`/admin/timetables/${timetableId}/publish`);
    return res.data;
  },

  // Teacher Endpoints
  getTeacherPersonalSchedule: async (
    academicYearId?: string,
    date?: string
  ): Promise<TeacherPersonalSchedule> => {
    const res = await apiClient.get<TeacherPersonalSchedule>('/teacher/timetable/personal', {
      params: {
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
        ...(date ? { date } : {}),
      },
    });
    return res.data;
  },

  getTeacherGradeTimetable: async (
    sectionId: string,
    date?: string
  ): Promise<TimetableDetail> => {
    const res = await apiClient.get<TimetableDetail>('/teacher/timetable/grade-wise', {
      params: {
        section_id: sectionId,
        ...(date ? { date } : {}),
      },
    });
    return res.data;
  },
};

