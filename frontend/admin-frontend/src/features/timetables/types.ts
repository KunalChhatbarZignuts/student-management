export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  working_days?: string;
  status: string;
  periods?: Period[];
  grades_count?: number;
  assigned_grade_ids?: string[];
  assigned_grade_names?: string[];
}

export interface ShiftCreatePayload {
  name: string;
  start_time: string;
  end_time: string;
  working_days?: string;
  assigned_grade_ids?: string[];
}

export interface Period {
  id: string;
  shift_id: string;
  number: number;
  name?: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  status: string;
}

export interface PeriodCreatePayload {
  number: number;
  name?: string;
  start_time: string;
  end_time: string;
  is_break?: boolean;
}

export interface TimetableSlot {
  id?: string;
  day_of_week: number;
  period_id: string;
  period_number?: number;
  period_name?: string;
  start_time?: string;
  end_time?: string;
  is_break?: boolean;
  subject_id?: string;
  subject_name?: string;
  subject_code?: string;
  teacher_id?: string;
  teacher_name?: string;
  room_number?: string;
  is_current_teacher?: boolean;
}

export interface TimetableDetail {
  id: string;
  academic_year_id: string;
  academic_year_name: string;
  grade_id: string;
  grade_name: string;
  section_id: string;
  section_name: string;
  shift_id: string;
  shift_name: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  working_days: string[];
  periods: Period[];
  entries: TimetableSlot[];
}

export interface ClashValidationResult {
  has_clashes: boolean;
  clashes: string[];
}

export interface SaveDraftPayload {
  academic_year_id: string;
  grade_id: string;
  section_id: string;
  entries: {
    day_of_week: number;
    period_id: string;
    subject_id?: string;
    teacher_id?: string;
    room_number?: string;
  }[];
}

export interface TeacherSlotItem {
  id: string;
  day_of_week: number;
  period_number: number;
  period_name?: string;
  start_time: string;
  end_time: string;
  grade_name: string;
  section_name: string;
  subject_name?: string;
  subject_code?: string;
  room_number?: string;
}

export interface TeacherPersonalSchedule {
  teacher_id: string;
  teacher_name: string;
  academic_year_id: string;
  working_days: string[];
  slots: TeacherSlotItem[];
}

