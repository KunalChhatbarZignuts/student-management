export interface FeeComponent {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  fee_type: string;
  payment_frequency: string;
  is_mandatory: boolean;
  is_recurring: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface FeeComponentCreatePayload {
  name: string;
  code: string;
  description?: string;
  fee_type: string;
  payment_frequency: string;
  is_mandatory: boolean;
  is_recurring: boolean;
  status?: string;
}

export interface FeeComponentUpdatePayload {
  name?: string;
  description?: string;
  fee_type?: string;
  payment_frequency?: string;
  is_mandatory?: boolean;
  is_recurring?: boolean;
  status?: string;
}

export interface FeeStructureItem {
  id: string;
  fee_structure_id: string;
  fee_component_id: string;
  component_name?: string | null;
  component_code?: string | null;
  amount: number | string;
  payment_frequency: string;
  is_mandatory: boolean;
  display_order: number;
}

export interface FeeStructureItemCreatePayload {
  fee_component_id: string;
  amount: number;
  payment_frequency: string;
  is_mandatory: boolean;
  display_order?: number;
}

export interface FeeStructure {
  id: string;
  academic_year_id: string;
  academic_year_name?: string | null;
  grade_id: string;
  grade_name?: string | null;
  name: string;
  description?: string | null;
  total_amount: number | string;
  currency: string;
  status: 'active' | 'inactive' | 'archived';
  effective_date: string;
  created_by_user_id?: string | null;
  items: FeeStructureItem[];
  created_at: string;
  updated_at: string;
}

export interface FeeStructureListItem {
  id: string;
  academic_year_id: string;
  academic_year_name?: string | null;
  grade_id: string;
  grade_name?: string | null;
  name: string;
  total_amount: number | string;
  currency: string;
  status: string;
  effective_date: string;
  items_count: number;
  created_at: string;
}

export interface FeeStructureCreatePayload {
  academic_year_id: string;
  grade_id: string;
  name: string;
  description?: string;
  currency?: string;
  status?: string;
  effective_date?: string;
  items: FeeStructureItemCreatePayload[];
}

export interface StudentFeeAdjustmentItem {
  id?: string;
  adjustment_type: string; // DISCOUNT_PERCENTAGE, DISCOUNT_FIXED, CONCESSION_SCHOLARSHIP, CONCESSION_FINANCIAL, CONCESSION_SPECIAL, ADDITIONAL_CHARGE
  category: 'discount' | 'concession' | 'additional_charge';
  description: string;
  calculation_type: 'percentage' | 'fixed';
  rate?: number | null;
  amount: number;
}

export interface FeeInstallmentItem {
  id: string;
  assignment_id: string;
  installment_number: number;
  installment_name: string;
  due_date: string;
  amount: number | string;
  paid_amount: number | string;
  outstanding_amount: number | string;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
}

export interface StudentFeeAssignmentItem {
  id: string;
  fee_component_id: string;
  component_name: string;
  amount: number | string;
  payment_frequency: string;
  is_mandatory: boolean;
  is_selected: boolean;
}

export interface StudentFeeAssignment {
  id: string;
  student_id: string;
  student_name?: string;
  student_code?: string;
  enrollment_number?: string | null;
  academic_year_id: string;
  academic_year_name?: string | null;
  grade_id: string;
  grade_name?: string | null;
  fee_structure_id: string;
  fee_structure_name?: string | null;
  admission_id?: string | null;
  base_amount: number | string;
  total_discount: number | string;
  total_additional: number | string;
  final_payable_amount: number | string;
  currency: string;
  installment_frequency: string;
  status: string;
  assigned_date: string;
  notes?: string | null;
  items: StudentFeeAssignmentItem[];
  adjustments: StudentFeeAdjustmentItem[];
  installments: FeeInstallmentItem[];
  created_at: string;
}

export interface StudentFeeAssignmentListItem {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  enrollment_number?: string | null;
  grade_name: string;
  academic_year_name: string;
  base_amount: number | string;
  total_discount: number | string;
  total_additional: number | string;
  final_payable_amount: number | string;
  currency: string;
  status: string;
  assigned_date: string;
  installments_count: number;
}

export interface PaginatedFeeAssignmentsResponse {
  items: StudentFeeAssignmentListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface InstallmentSchedulePreview {
  installment_number: number;
  installment_name: string;
  due_date: string;
  amount: number | string;
}

export interface FeeCalculationResponse {
  base_amount: number | string;
  total_discount: number | string;
  total_additional: number | string;
  final_payable_amount: number | string;
  currency: string;
  installment_frequency: string;
  installments: InstallmentSchedulePreview[];
}

export interface FeeCalculationRequest {
  fee_structure_id: string;
  selected_component_ids: string[];
  adjustments: StudentFeeAdjustmentItem[];
  installment_frequency: string;
  start_date?: string;
}

export interface GradeWiseSummary {
  grade_id: string;
  grade_name: string;
  student_count: number;
  total_assigned: number;
}

export interface FeeDashboardMetrics {
  total_assigned_fees: number | string;
  total_collected_fees: number | string;
  total_outstanding_fees: number | string;
  total_active_structures: number;
  total_student_assignments: number;
  grade_wise_summaries: GradeWiseSummary[];
}

export interface FeeReceipt {
  receipt_number: string;
  payment_date: string;
  amount: number | string;
  payment_method: string;
  status: string;
  reference_note?: string | null;
  student_id: string;
  student_name: string;
  student_code?: string | null;
  enrollment_number?: string | null;
  grade_name?: string | null;
  academic_year_name?: string | null;
  installment_id: string;
  installment_name: string;
  installment_total_amount: number | string;
  installment_paid_amount: number | string;
  installment_outstanding_amount: number | string;
  currency: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  installment_id: string;
  installment_name?: string | null;
  student_id: string;
  student_name: string;
  student_code?: string | null;
  grade_name?: string | null;
  gateway_provider: string;
  gateway_order_id: string;
  gateway_payment_id?: string | null;
  amount: number | string;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
  receipt_number?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  created_at: string;
}

export interface PaginatedTransactionsResponse {
  items: PaymentTransaction[];
  total: number;
  skip: number;
  limit: number;
}

export interface PaymentWebhookEvent {
  id: string;
  event_id: string;
  gateway_provider: string;
  event_type: string;
  processing_status: 'received' | 'processed' | 'failed' | 'ignored';
  failure_reason?: string | null;
  retry_count: number;
  processed_at?: string | null;
  created_at: string;
  raw_payload?: string | null;
}

export interface PaginatedWebhookEventsResponse {
  items: PaymentWebhookEvent[];
  total: number;
  skip: number;
  limit: number;
}

export interface RecordOfflinePaymentPayload {
  amount: number;
  payment_method: string;
  payment_date?: string;
  reference_note?: string;
}

export interface StudentFeeAdjustmentPayload {
  adjustment_type: string;
  category: 'discount' | 'concession' | 'additional_charge';
  description: string;
  calculation_type: 'percentage' | 'fixed';
  rate?: number | null;
  amount: number;
}


