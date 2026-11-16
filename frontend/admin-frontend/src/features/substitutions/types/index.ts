export interface SubstituteCandidate {
  teacher_id: string;
  teacher_name: string;
  employee_code: string;
  department: string;
  is_subject_match: boolean;
  is_department_match: boolean;
  daily_assigned_periods_count: number;
  is_available: boolean;
  availability_conflict_reason?: string | null;
}

export interface AffectedTimetableSlot {
  timetable_entry_id: string;
  day_of_week: number;
  period_id: string;
  period_name: string;
  period_number: number;
  start_time: string;
  end_time: string;
  grade_id: string;
  grade_name: string;
  section_id: string;
  section_name: string;
  subject_id?: string | null;
  subject_name?: string | null;
  original_teacher_id: string;
  original_teacher_name: string;
  current_substitution_id?: string | null;
  current_substitute_name?: string | null;
  substitution_status?: string | null;
}

export interface AbsentTeacherCoverageResponse {
  teacher_id: string;
  teacher_name: string;
  employee_code: string;
  department: string;
  date: string;
  attendance_status: string;
  total_slots_count: number;
  covered_slots_count: number;
  affected_slots: AffectedTimetableSlot[];
}

export interface SubstitutionCreateRequest {
  date: string;
  timetable_entry_id: string;
  substitute_teacher_id: string;
  reason?: string;
  notes?: string;
}

export interface SubstitutionResponse {
  id: string;
  date: string;
  timetable_entry_id: string;
  original_teacher_id: string;
  original_teacher_name: string;
  substitute_teacher_id: string;
  substitute_teacher_name: string;
  status: string;
  reason?: string | null;
  notes?: string | null;
  period_name: string;
  grade_name: string;
  section_name: string;
  subject_name?: string | null;
  created_at: string;
}
