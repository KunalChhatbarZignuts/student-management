export type AttendanceStatusType = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AssignedSectionItem {
  section_id: string;
  section_name: string;
  grade_id: string;
  grade_name: string;
  academic_year_id?: string;
  role?: string;
  enrolled_students_count: number;
}

export interface SectionRosterStudentItem {
  student_id: string;
  enrollment_id: string;
  student_name: string;
  enrollment_number?: string;
  student_code: string;
  roll_no?: number;
  gender?: string;
}

export interface AttendanceRecordItem {
  id: string;
  session_id?: string;
  student_id: string;
  enrollment_id?: string;
  status: AttendanceStatusType;
  remark?: string | null;
  student_name?: string | null;
  student_code?: string | null;
  enrollment_number?: string | null;
  roll_no?: number | null;
}

export interface AttendanceSessionResponse {
  id: string;
  academic_year_id?: string | null;
  grade_id?: string | null;
  grade_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  date: string;
  period: number;
  submission_status: string;
  taken_by_teacher_id?: string | null;
  teacher_name?: string | null;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  locked_at?: string | null;
  created_at: string;
  updated_at: string;
  records: AttendanceRecordItem[];
}

export interface SectionDailyOverviewItem {
  grade_id: string;
  grade_name: string;
  section_id: string;
  section_name: string;
  session_id?: string | null;
  status: 'Marked' | 'Unmarked';
  total_students: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_percentage: number;
  marked_by?: string | null;
  marked_at?: string | null;
}

export interface AdminAttendanceOverviewResponse {
  date: string;
  total_sections: number;
  marked_sections: number;
  total_students: number;
  total_present: number;
  total_absent: number;
  total_late: number;
  total_excused: number;
  overall_percentage: number;
  sections: SectionDailyOverviewItem[];
}

export interface StudentAttendanceHistoryRecord {
  date: string;
  period: number;
  status: AttendanceStatusType;
  remark?: string | null;
  grade_name: string;
  section_name: string;
  marked_by?: string | null;
}

export interface StudentAttendanceHistoryResponse {
  student_id: string;
  student_name: string;
  enrollment_number?: string | null;
  student_code: string;
  grade_name: string;
  section_name: string;
  total_working_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_percentage: number;
  records: StudentAttendanceHistoryRecord[];
}

export interface AttendanceAuditItemResponse {
  id: string;
  record_id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  enrollment_number?: string | null;
  previous_status: string;
  new_status: string;
  reason: string;
  modified_by_name?: string | null;
  created_at: string;
}

export interface SectionRollCallRecordPayload {
  student_id: string;
  status: AttendanceStatusType;
  remark?: string | null;
}

export interface SectionAttendanceCreatePayload {
  date: string;
  period: number;
  records: SectionRollCallRecordPayload[];
}

export interface AdminAttendanceRecordUpdatePayload {
  status: AttendanceStatusType;
  reason: string;
  remark?: string | null;
}

