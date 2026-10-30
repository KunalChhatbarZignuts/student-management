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
