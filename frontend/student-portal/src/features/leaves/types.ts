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

export interface StudentLeaveApplyPayload {
  start_date: string;
  end_date: string;
  reason: string;
}

export interface ParentLeaveApplyPayload {
  student_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

