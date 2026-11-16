export interface GradeDistributionItem {
  grade_id: string;
  grade_name: string;
  level: number;
  enrolled_count: number;
  sections_count: number;
}

export interface SectionDistributionItem {
  section_id: string;
  section_name: string;
  grade_name: string;
  enrolled_count: number;
  capacity?: number | null;
  class_teacher_name?: string | null;
}

export interface EnrollmentDashboardMetrics {
  total_enrolled: number;
  unassigned_students: number;
  transferred_students: number;
  promoted_students: number;
  inactive_students: number;
  grade_distribution: GradeDistributionItem[];
  section_distribution: SectionDistributionItem[];
}

export interface UnassignedStudentItem {
  student_id: string;
  student_code: string;
  enrollment_number?: string | null;
  first_name: string;
  last_name: string;
  gender?: string | null;
  admission_date: string;
  department: string;
}

export interface BulkEnrollmentRequest {
  student_ids: string[];
  academic_year_id: string;
  grade_id: string;
  section_id: string;
  enrollment_date?: string | null;
}

export interface BulkEnrollmentResponse {
  enrolled_count: number;
  section_id: string;
  section_name: string;
  grade_name: string;
  enrolled_student_ids: string[];
}

export interface StudentTransferCreate {
  student_id: string;
  target_section_id: string;
  target_grade_id?: string | null;
  target_academic_year_id?: string | null;
  transfer_date?: string | null;
  transfer_type: 'SECTION_TRANSFER' | 'GRADE_TRANSFER' | 'YEAR_TRANSITION';
  reason: string;
  remarks?: string | null;
}

export interface StudentTransferRecordResponse {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  from_academic_year_name: string;
  to_academic_year_name: string;
  from_grade_name?: string | null;
  to_grade_name?: string | null;
  from_section_name?: string | null;
  to_section_name?: string | null;
  transfer_date: string;
  transfer_type: string;
  reason: string;
  remarks?: string | null;
  performed_by_name?: string | null;
  created_at: string;
}

export interface TargetSectionCapacityItem {
  section_id: string;
  section_name: string;
  capacity?: number | null;
  current_enrolled: number;
  available_seats?: number | null;
}

export interface PromotionPreviewRequest {
  source_academic_year_id: string;
  source_grade_id: string;
  source_section_id?: string | null;
  target_academic_year_id: string;
  target_grade_id: string;
}

export interface PromotionStudentPreviewItem {
  student_id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  current_roll_no: number;
  current_grade_id: string;
  current_grade_name: string;
  current_section_id?: string | null;
  current_section_name?: string | null;
  exam_result?: string | null;
  exam_percentage?: number | null;
  suggested_action: 'PROMOTE' | 'REPEAT' | 'LEFT';
  is_eligible: boolean;
}

export interface PromotionPreviewResponse {
  source_grade_name: string;
  target_grade_name: string;
  source_year_name: string;
  target_year_name: string;
  target_sections: TargetSectionCapacityItem[];
  students: PromotionStudentPreviewItem[];
}

export interface StudentPromotionDecision {
  student_id: string;
  action: 'PROMOTE' | 'REPEAT' | 'LEFT';
  target_section_id?: string | null;
  reason?: string | null;
}

export interface PromotionExecuteRequest {
  source_academic_year_id: string;
  target_academic_year_id: string;
  target_grade_id: string;
  effective_date?: string | null;
  decisions: StudentPromotionDecision[];
}

export interface PromotionExecuteResponse {
  promoted_count: number;
  repeated_count: number;
  left_count: number;
  total_processed: number;
  message: string;
}

export interface EnhancedEnrollmentHistoryItem {
  id: string;
  student_id: string;
  grade_id?: string | null;
  grade_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  academic_year_id: string;
  academic_year_name?: string | null;
  roll_no: number;
  class_teacher_name?: string | null;
  status: string;
  enrollment_date: string;
  joined_on: string;
  left_on?: string | null;
  reason?: string | null;
  remarks?: string | null;
  created_at: string;
}
