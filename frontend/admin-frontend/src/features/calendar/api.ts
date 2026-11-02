import apiClient from '@/lib/axios';
import {
  DateWorkingStatus,
  HolidayCategory,
  MonthCalendarResponse,
  SchoolCalendarSettings,
  SchoolHoliday,
  SchoolHolidayCreatePayload,
  SchoolHolidayUpdatePayload,
  SpecialWorkingDay,
} from './types';

export const calendarApi = {
  // Categories
  getCategories: async (): Promise<HolidayCategory[]> => {
    const { data } = await apiClient.get<HolidayCategory[]>('/admin/calendar/categories');
    return data;
  },

  createCategory: async (payload: { name: string; code: string; description?: string }): Promise<HolidayCategory> => {
    const { data } = await apiClient.post<HolidayCategory>('/admin/calendar/categories', payload);
    return data;
  },

  // Holidays
  getAdminHolidays: async (params?: {
    academic_year_id?: string;
    category_id?: string;
    grade_id?: string;
    status_filter?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<SchoolHoliday[]> => {
    const { data } = await apiClient.get<SchoolHoliday[]>('/admin/calendar/holidays', { params });
    return data;
  },

  getTeacherHolidays: async (params?: {
    academic_year_id?: string;
    grade_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<SchoolHoliday[]> => {
    const { data } = await apiClient.get<SchoolHoliday[]>('/teacher/calendar/holidays', { params });
    return data;
  },

  createHoliday: async (payload: SchoolHolidayCreatePayload): Promise<SchoolHoliday> => {
    const { data } = await apiClient.post<SchoolHoliday>('/admin/calendar/holidays', payload);
    return data;
  },

  updateHoliday: async (id: string, payload: SchoolHolidayUpdatePayload): Promise<SchoolHoliday> => {
    const { data } = await apiClient.put<SchoolHoliday>(`/admin/calendar/holidays/${id}`, payload);
    return data;
  },

  cancelHoliday: async (id: string, reason: string): Promise<SchoolHoliday> => {
    const { data } = await apiClient.post<SchoolHoliday>(`/admin/calendar/holidays/${id}/cancel`, { reason });
    return data;
  },

  deleteHoliday: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/calendar/holidays/${id}`);
  },

  // Calendar Settings & Weekly Offs
  getSettings: async (academic_year_id?: string): Promise<SchoolCalendarSettings> => {
    const { data } = await apiClient.get<SchoolCalendarSettings>('/admin/calendar/settings', {
      params: academic_year_id ? { academic_year_id } : undefined,
    });
    return data;
  },

  updateSettings: async (
    payload: { weekly_off_days: number[] },
    academic_year_id?: string
  ): Promise<SchoolCalendarSettings> => {
    const { data } = await apiClient.put<SchoolCalendarSettings>('/admin/calendar/settings', payload, {
      params: academic_year_id ? { academic_year_id } : undefined,
    });
    return data;
  },

  // Special Working Days
  getSpecialWorkingDays: async (academic_year_id?: string): Promise<SpecialWorkingDay[]> => {
    const { data } = await apiClient.get<SpecialWorkingDay[]>('/admin/calendar/special-working-days', {
      params: academic_year_id ? { academic_year_id } : undefined,
    });
    return data;
  },

  createSpecialWorkingDay: async (payload: {
    academic_year_id: string;
    date: string;
    reason: string;
  }): Promise<SpecialWorkingDay> => {
    const { data } = await apiClient.post<SpecialWorkingDay>('/admin/calendar/special-working-days', payload);
    return data;
  },

  deleteSpecialWorkingDay: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/calendar/special-working-days/${id}`);
  },

  // Monthly Overview
  getMonthlyCalendar: async (
    year: number,
    month: number,
    academic_year_id?: string,
    grade_id?: string,
    isTeacher?: boolean
  ): Promise<MonthCalendarResponse> => {
    const path = isTeacher ? '/teacher/calendar/monthly' : '/admin/calendar/monthly';
    const { data } = await apiClient.get<MonthCalendarResponse>(path, {
      params: { year, month, academic_year_id, grade_id },
    });
    return data;
  },

  // Date Status Check
  checkDateStatus: async (
    date: string,
    grade_id?: string,
    section_id?: string,
    isTeacher?: boolean
  ): Promise<DateWorkingStatus> => {
    const path = isTeacher ? '/teacher/calendar/check-date' : '/admin/calendar/check-date';
    const { data } = await apiClient.get<DateWorkingStatus>(path, {
      params: { date, grade_id, section_id },
    });
    return data;
  },
};

