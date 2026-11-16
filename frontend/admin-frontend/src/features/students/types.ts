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
  blood_group?: string;
  allergies?: string;
  medical_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  authorized_pickup_info?: string;
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
  middle_name?: string;
  last_name?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  alternate_phone?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  previous_school_name?: string;
  previous_school_details?: string;
  admission_date?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  status?: string;
  blood_group?: string;
  allergies?: string;
  medical_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  authorized_pickup_info?: string;
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

export interface StudentPersonalDetails {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  dob: string;
  gender?: string | null;
  blood_group?: string | null;
  allergies?: string | null;
  medical_conditions?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  authorized_pickup_info?: string | null;
  phone?: string | null;
  alternate_phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  profile_photo?: string | null;
  department?: string | null;
  status: string;
  admission_date?: string | null;
  created_at: string;
  user_id: string;
  user_status?: string | null;
  must_change_password: boolean;
}

export interface StudentSubjectItem {
  id: string;
  name: string;
  code: string;
  department?: string | null;
  teacher_name?: string | null;
}

export interface StudentEnrollmentHistoryItem {
  id: string;
  enrollment_number?: string | null;
  roll_number?: string | null;
  academic_year_name: string;
  grade_name: string;
  section_name: string;
  status: string;
  class_teacher_name?: string | null;
  enrolled_at: string;
}

export interface StudentAcademicDetails {
  current_academic_year?: string | null;
  current_grade?: string | null;
  current_section?: string | null;
  grade_id?: string | null;
  section_id?: string | null;
  current_roll_number?: string | null;
  current_enrollment_number?: string | null;
  class_teacher_name?: string | null;
  active_subjects: StudentSubjectItem[];
  enrollment_history: StudentEnrollmentHistoryItem[];
}

export interface StudentParentItem {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  is_primary_contact: boolean;
  is_emergency_contact: boolean;
  can_pickup: boolean;
  user_status?: string | null;
}

export interface StudentAdmissionDetails {
  application_number?: string | null;
  status?: string | null;
  admission_date?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
  academic_year_name?: string | null;
  previous_school_name?: string | null;
  previous_school_details?: string | null;
}

export interface StudentDailyAttendanceItem {
  date: string;
  status: string;
  period_slot?: string | null;
  subject_name?: string | null;
  teacher_name?: string | null;
  remarks?: string | null;
}

export interface StudentAttendanceSummary {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_rate_percentage: number;
  recent_history: StudentDailyAttendanceItem[];
}

export interface StudentLeaveApplicationItem {
  id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  leave_type: string;
  submission_role?: string | null;
  reason: string;
  status: string;
  reviewed_by_teacher_name?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

export interface StudentFeeInstallmentItem {
  id: string;
  installment_number: number;
  installment_name?: string | null;
  due_date: string;
  amount: string | number;
  paid_amount: string | number;
  balance: string | number;
  status: string;
}

export interface StudentPaymentTransactionItem {
  id: string;
  receipt_number?: string | null;
  payment_method: string;
  amount: string | number;
  payment_date: string;
  status: string;
  reference_note?: string | null;
}

export interface StudentFeeSummary {
  has_fee_assignment: boolean;
  fee_structure_name?: string | null;
  academic_year_name?: string | null;
  currency: string;
  total_amount: string | number;
  discount_amount: string | number;
  net_amount: string | number;
  paid_amount: string | number;
  outstanding_balance: string | number;
  status?: string | null;
  installments: StudentFeeInstallmentItem[];
  payments: StudentPaymentTransactionItem[];
}

export interface StudentTimetableSlotItem {
  id?: string | null;
  day_of_week: string;
  period_name: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code?: string | null;
  teacher_name?: string | null;
  room_number?: string | null;
}

export interface ComprehensiveStudentDetailResponse {
  student_id: string;
  student_code: string;
  enrollment_number?: string | null;
  personal_details: StudentPersonalDetails;
  academic_details: StudentAcademicDetails;
  parents: StudentParentItem[];
  admission_details: StudentAdmissionDetails;
  attendance_summary: StudentAttendanceSummary;
  leave_applications: StudentLeaveApplicationItem[];
  fees: StudentFeeSummary;
  timetable: StudentTimetableSlotItem[];
}


