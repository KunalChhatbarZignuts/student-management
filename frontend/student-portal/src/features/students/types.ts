export interface StudentResponse {
  id: string;
  student_code: string;
  enrollment_number: string;
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
  current_academic_year?: string | null;
  current_grade?: string | null;
  current_section?: string | null;
  class_teacher_name?: string | null;
}
