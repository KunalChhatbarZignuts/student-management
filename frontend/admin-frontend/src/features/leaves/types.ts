export interface LeaveApplicationItem {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  enrollment_number?: string | null;
  submitted_by_user_id: string;
  submission_role: 'student' | 'parent';
  submitted_by_name: string;
  academic_year_id?: string | null;
  academic_year_name?: string | null;
  grade_id?: string | null;
  grade_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  class_teacher_id?: string | null;
  class_teacher_name?: string | null;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  teacher_remarks?: string | null;
  decided_by_teacher_id?: string | null;
  decided_by_teacher_name?: string | null;
  decided_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveListResponse {
  items: LeaveApplicationItem[];
  total: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}

export interface TeacherApprovePayload {
  remarks?: string;
}

export interface TeacherRejectPayload {
  remarks: string;
}

export interface LeaveMonitoringFilters {
  academic_year_id?: string;
  grade_id?: string;
  section_id?: string;
  class_teacher_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  query?: string;
}

