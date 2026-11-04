export interface PortalInstallmentItem {
  id: string;
  installment_number: number;
  installment_name: string;
  due_date: string;
  amount: number | string;
  paid_amount: number | string;
  outstanding_amount: number | string;
  status: 'paid' | 'pending' | 'partially_paid' | 'overdue';
  receipt_numbers: string[];
  can_pay_online: boolean;
}

export interface StudentPortalFeeScheduleResponse {
  assignment_id?: string;
  student_id: string;
  student_name: string;
  student_code?: string | null;
  grade_name?: string | null;
  academic_year_name?: string | null;
  base_amount?: number | string;
  total_discount?: number | string;
  total_additional?: number | string;
  final_payable_amount?: number | string;
  total_paid_amount?: number | string;
  total_outstanding_amount?: number | string;
  total_annual_fee?: number | string;
  total_discount_concession?: number | string;
  total_additional_charges?: number | string;
  net_payable_fee?: number | string;
  total_paid?: number | string;
  total_outstanding?: number | string;
  currency: string;
  installments: PortalInstallmentItem[];
  payment_history?: any[];
}

export interface PaymentOrderCreatePayload {
  installment_id: string;
  amount?: number;
}

export interface PaymentOrderResponse {
  order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  installment_id: string;
  student_name: string;
  installment_name: string;
}

export interface PaymentVerifyPayload {
  gateway_order_id: string;
  gateway_payment_id: string;
  gateway_signature: string;
}

export interface PaymentVerificationResponse {
  status: string;
  verified: boolean;
  message: string;
  receipt_number?: string | null;
  transaction_id?: string | null;
}

export interface FeeReceiptDetail {
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

