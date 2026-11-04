export interface StudentItem {
  id: string;
  student_code: string;
  enrollment_number: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  dob: string;
  class_name: string;
  section: string;
  department: string;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  admission_date: string;
  status: string;
}

export interface StudentCreatePayload {
  email: string;
  first_name: string;
  last_name: string;
  dob: string;
  department?: string;
  admission_date: string;
  academic_year_id: string;
  grade_id: string;
  section_id: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  password?: string;
}

export interface StudentCreateResponse {
  student: StudentItem & { initial_password?: string; login_identifier?: string };
  enrollment_number: string;
  user_status: string;
  invite_expires_at?: string;
  invite_token?: string;
  initial_password?: string;
  login_identifier?: string;
}

export interface StudentUpdatePayload {
  first_name?: string;
  last_name?: string;
  dob?: string;
  department?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  status?: string;
  target_academic_year_id?: string;
  target_grade_id?: string;
  target_section_id?: string;
  transfer_reason?: string;
}

export interface PaginatedUsersResponse {
  items: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    must_change_password: boolean;
    last_login_at?: string | null;
    created_at: string;
    updated_at: string;
    student?: StudentItem | null;
    teacher?: any;
    parent?: any;
  }>;
  total: number;
  skip: number;
  limit: number;
}

