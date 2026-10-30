export interface StudentItem {
  id: string;
  student_code: string;
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
  class_name: string;
  section: string;
  department: string;
  admission_date: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
}

export interface PaginatedUsersResponse {
  items: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    must_change_password: boolean;
    totp_enabled: boolean;
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

