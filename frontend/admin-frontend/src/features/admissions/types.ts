import { StudentFeeAdjustmentItem, StudentFeeAssignment } from '@/features/fees/types';

export interface AdmissionStudentPayload {
  first_name: string;
  middle_name?: string;
  last_name: string;
  dob: string;
  gender: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  profile_photo?: string;
  previous_school_name?: string;
  previous_school_details?: string;
  department?: string;
  password?: string;
}

export interface AdmissionParentPayload {
  existing_parent_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  relationship_type: string;
  is_primary_guardian: boolean;
  password?: string;
}

export interface AdmissionFeeAssignmentPayload {
  fee_structure_id: string;
  selected_component_ids: string[];
  adjustments: StudentFeeAdjustmentItem[];
  installment_frequency: string;
  notes?: string;
}

export interface AdmissionCreateRequest {
  student: AdmissionStudentPayload;
  parents: AdmissionParentPayload[];
  academic_year_id: string;
  grade_id: string;
  section_id: string;
  admission_date: string;
  create_student_account: boolean;
  notes?: string;
  fee_assignment?: AdmissionFeeAssignmentPayload;
}

export interface AdmissionParentSummary {
  parent_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  relationship_type: string;
  is_primary_guardian: boolean;
  initial_password?: string | null;
  account_status: string;
}

export interface StudentAccountSummary {
  user_id: string;
  email: string;
  login_identifier: string;
  initial_password?: string | null;
  account_status: string;
}

export interface StudentDetailsSummary {
  id: string;
  enrollment_number: string;
  student_code: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  gender?: string | null;
  dob: string;
  email: string;
}

export interface AcademicDetailsSummary {
  academic_year_id: string;
  academic_year_name: string;
  grade_id: string;
  grade_name: string;
  section_id: string;
  section_name: string;
  roll_no: number;
  class_teacher_name?: string | null;
  class_teacher_employee_code?: string | null;
  grade_coordinator_name?: string | null;
}

export interface AdmissionResponse {
  admission_id: string;
  admission_number: string;
  status: string;
  admission_date: string;
  student: StudentDetailsSummary;
  student_account: StudentAccountSummary;
  academic: AcademicDetailsSummary;
  parents: AdmissionParentSummary[];
  fee_assignment?: StudentFeeAssignment | null;
  created_at: string;
}

export interface AdmissionListItem {
  id: string;
  admission_number: string;
  enrollment_number: string;
  student_name: string;
  grade_name: string;
  section_name: string;
  academic_year_name: string;
  class_teacher_name?: string | null;
  admission_date: string;
  status: string;
  created_at: string;
}

export interface PaginatedAdmissionsResponse {
  items: AdmissionListItem[];
  total: number;
  skip: number;
  limit: number;
}

