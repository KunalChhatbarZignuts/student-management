export interface StudentResponse {
  id: string;
  student_code: string;
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
