export interface HolidayCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HolidayGradeInfo {
  id: string;
  name: string;
}

export interface SchoolHoliday {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
  description: string | null;
  status: string; // "active" | "cancelled"
  is_school_wide: boolean;
  applicable_grades: HolidayGradeInfo[];
  created_at: string;
  updated_at: string;
}

export interface SchoolHolidayCreatePayload {
  name: string;
  category_id: string;
  academic_year_id: string;
  start_date: string;
  end_date: string;
  description?: string;
  grade_ids?: string[];
  section_ids?: string[];
  confirm_attendance_override?: boolean;
}

export interface SchoolHolidayUpdatePayload {
  name?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  grade_ids?: string[];
  section_ids?: string[];
  reason?: string;
  confirm_attendance_override?: boolean;
}

export interface SchoolCalendarSettings {
  academic_year_id: string;
  weekly_off_days: number[]; // 0=Monday, 6=Sunday
  weekly_off_names: string[];
}

export interface SpecialWorkingDay {
  id: string;
  academic_year_id: string;
  date: string;
  reason: string;
  created_at: string;
}

export interface DateWorkingStatus {
  date: string;
  is_working_day: boolean;
  day_type: 'working_day' | 'holiday' | 'weekly_off' | 'special_working_day';
  reason: string | null;
  holiday_name: string | null;
  holiday_category: string | null;
  can_mark_attendance: boolean;
}

export interface MonthlyCalendarDay {
  date: string;
  day_of_week: number;
  day_name: string;
  is_working_day: boolean;
  day_type: 'working_day' | 'holiday' | 'weekly_off' | 'special_working_day';
  label: string | null;
  category_name: string | null;
  is_school_wide: boolean;
  applicable_grade_names: string[];
}

export interface MonthCalendarResponse {
  year: number;
  month: number;
  total_days: number;
  working_days: number;
  holidays: number;
  weekly_offs: number;
  days: MonthlyCalendarDay[];
}

