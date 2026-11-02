export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status: string;
}

export interface Grade {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  level: number;
  academic_year_id: string;
  academic_year_name?: string | null;
  coordinator_teacher_id?: string | null;
  coordinator_name?: string | null;
  shift_id?: string | null;
  shift_name?: string | null;
  status: 'active' | 'inactive';
  total_sections: number;
  total_students: number;
  created_at: string;
  updated_at: string;
}

export interface GradeCreatePayload {
  name: string;
  code?: string;
  description?: string;
  level: number;
  academic_year_id: string;
  shift_id?: string;
  coordinator_teacher_id?: string;
}

export interface GradeUpdatePayload {
  name?: string;
  code?: string;
  description?: string;
  level?: number;
  shift_id?: string;
  coordinator_teacher_id?: string | null;
}

export interface GradeListResponse {
  items: Grade[];
  total: number;
  page: number;
  size: number;
}

export interface Section {
  id: string;
  grade_id: string;
  grade_name?: string | null;
  name: string;
  code?: string | null;
  academic_year_id: string;
  academic_year_name?: string | null;
  class_capacity: number | null;
  status: 'active' | 'inactive';
  assigned_teacher_id?: string | null;
  assigned_teacher_name?: string | null;
  total_students: number;
  created_at: string;
  updated_at: string;
}

export interface SectionCreatePayload {
  grade_id: string;
  name: string;
  code?: string;
  academic_year_id: string;
  class_capacity?: number;
  assigned_teacher_id?: string;
}

export interface SectionUpdatePayload {
  name?: string;
  code?: string;
  class_capacity?: number;
}

export interface SectionListResponse {
  items: Section[];
  total: number;
  page: number;
  size: number;
}

export interface GradeDetailResponse extends Grade {
  sections: Section[];
}

export interface TeacherAssignmentItem {
  id: string;
  section_id?: string | null;
  section_name?: string | null;
  grade_name?: string | null;
  teacher_id: string;
  teacher_name?: string | null;
  employee_code?: string | null;
  assignment_type: string;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
}

export interface EnrolledStudentItem {
  enrollment_id: string;
  student_id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  roll_no: number;
  status: string;
  enrollment_date: string;
  left_on?: string | null;
}

export interface SectionStudentsResponse {
  section_id: string;
  section_name: string;
  grade_name: string;
  total_students: number;
  capacity?: number | null;
  items: EnrolledStudentItem[];
}

export interface StudentEnrollPayload {
  grade_id: string;
  section_id: string;
  academic_year_id: string;
  roll_no?: number;
  enrollment_date?: string;
}

export interface StudentTransferPayload {
  target_section_id: string;
  target_grade_id?: string;
  transfer_date?: string;
  reason?: string;
}

export interface StudentPromotePayload {
  target_grade_id: string;
  target_section_id: string;
  target_academic_year_id: string;
  effective_date?: string;
}

export interface StudentEnrollmentHistoryItem {
  id: string;
  student_id: string;
  grade_id?: string | null;
  grade_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  academic_year_id: string;
  academic_year_name?: string | null;
  roll_no: number;
  status: string;
  enrollment_date: string;
  left_on?: string | null;
  created_at: string;
}

