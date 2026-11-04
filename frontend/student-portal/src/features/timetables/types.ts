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
  id?: string;
  academic_year_id?: string;
  academic_year_name?: string;
  grade_id?: string;
  grade_name?: string;
  section_id?: string;
  section_name?: string;
  shift_id?: string;
  shift_name?: string;
  version?: number;
  status?: string;
  published_at?: string;
  working_days?: string[];
  periods?: Period[];
  entries?: TimetableSlot[];
  // Legacy compatibility
  student_id?: string;
  student_name?: string;
  class_name?: string;
  section?: string;
  schedule?: {
    subject: string;
    subject_code: string;
    teacher: string;
    assignment_type: string;
    schedule: string;
  }[];
}

