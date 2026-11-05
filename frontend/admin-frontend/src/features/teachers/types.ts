export interface TeacherItem {
  id: string;
  employee_code: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  department: string;
  phone?: string | null;
}

export interface TeacherCreatePayload {
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  phone?: string;
}

export interface TeacherSubjectItem {
  id: string;
  teacher_id: string;
  teacher_name?: string | null;
  teacher_employee_code?: string | null;
  subject_id: string;
  subject_name?: string | null;
  subject_code?: string | null;
  academic_year_id?: string | null;
  academic_year_name?: string | null;
  grade_id?: string | null;
  grade_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherSubjectItemCreate {
  subject_id: string;
  academic_year_id?: string | null;
  grade_id?: string | null;
  section_id?: string | null;
}

export interface TeacherSubjectAssignmentCreate {
  teacher_id: string;
  academic_year_id?: string | null;
  assignments: TeacherSubjectItemCreate[];
}

export interface TeacherSubjectBulkCreate {
  teacher_id: string;
  academic_year_id?: string | null;
  subject_ids: string[];
  grade_id?: string | null;
  section_id?: string | null;
}

export interface TeacherSubjectUpdate {
  grade_id?: string | null;
  section_id?: string | null;
  academic_year_id?: string | null;
  status?: string;
}

export interface TeacherSubjectTeacherItem {
  teacher_id: string;
  teacher_name: string;
  employee_code: string;
  department: string;
  grade_name?: string | null;
  section_name?: string | null;
  academic_year_name?: string | null;
  status: string;
}

export interface TeacherProfileWithSubjects {
  teacher_id: string;
  employee_code: string;
  full_name: string;
  department: string;
  phone?: string | null;
  email?: string | null;
  assigned_sections: Array<{
    assignment_id: string;
    grade_id: string;
    grade_name: string;
    section_id: string;
    section_name: string;
    assignment_type: string;
    academic_year: string;
  }>;
  assigned_subjects: TeacherSubjectItem[];
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  department: string;
  credits?: number;
}

export interface TeacherProfileDetails {
  employee_code: string;
  first_name: string;
  last_name: string;
  department: string;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at: string;
  user_id: string;
  user_status?: string | null;
  must_change_password: boolean;
}

export interface TeacherClassRole {
  grade_name: string;
  section_name: string;
  academic_year_name?: string | null;
  role: string;
  assigned_at?: string | null;
}

export interface TeacherSubjectAllocation {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  grade_name: string;
  section_name: string;
  periods_per_week: number;
  status: string;
}

export interface TeacherTimetableSlot {
  id?: string | null;
  day_of_week: string;
  period_name: string;
  start_time: string;
  end_time: string;
  grade_name: string;
  section_name: string;
  subject_name: string;
  subject_code?: string | null;
  room_number?: string | null;
}

export interface TeacherAttendanceSessionLog {
  id: string;
  date: string;
  grade_name: string;
  section_name: string;
  subject_name?: string | null;
  total_students: number;
  present_count: number;
  recorded_at: string;
}

export interface TeacherWorkloadMetrics {
  total_assigned_subjects: number;
  total_weekly_periods: number;
  total_assigned_sections: number;
  has_class_teacher_role: boolean;
}

export interface ComprehensiveTeacherDetailResponse {
  teacher_id: string;
  employee_code: string;
  profile: TeacherProfileDetails;
  class_teacher_role?: TeacherClassRole | null;
  workload: TeacherWorkloadMetrics;
  subject_allocations: TeacherSubjectAllocation[];
  timetable: TeacherTimetableSlot[];
  attendance_activity: TeacherAttendanceSessionLog[];
  hr_notice: string;
}


