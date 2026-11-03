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

