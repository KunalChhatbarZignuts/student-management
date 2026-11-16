export interface POSStudentSearchItem {
  student_id: string;
  name: string;
  admission_number: string;
  grade_name: string;
  section_name: string;
  total_fee: number;
  total_paid: number;
  total_outstanding: number;
  pending_installment_count: number;
}

export interface POSInstallmentItem {
  installment_id: string;
  assignment_id: string;
  title: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
}

export interface POSRecentPayment {
  receipt_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_note?: string | null;
}

export interface POSStudentAccountDetails {
  student_id: string;
  name: string;
  admission_number: string;
  grade_name: string;
  section_name: string;
  total_fee: number;
  total_paid: number;
  total_outstanding: number;
  installments: POSInstallmentItem[];
  recent_payments: POSRecentPayment[];
}

export interface POSAllocationItem {
  installment_id: string;
  amount: number;
}

export interface POSCollectPaymentRequest {
  student_id: string;
  total_amount: number;
  payment_method: string;
  cash_tendered?: number | null;
  transaction_reference?: string | null;
  remarks?: string | null;
  allocations?: POSAllocationItem[] | null;
}

export interface POSReceiptItem {
  installment_title: string;
  due_date: string;
  amount_paid: number;
  prior_outstanding: number;
  new_outstanding: number;
}

export interface POSPaymentReceiptResponse {
  receipt_number: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  grade_name: string;
  section_name: string;
  payment_date: string;
  payment_method: string;
  amount_paid: number;
  cash_tendered?: number | null;
  change_returned?: number | null;
  transaction_reference?: string | null;
  remarks?: string | null;
  cashier_name: string;
  items: POSReceiptItem[];
  total_remaining_balance: number;
  pdf_url: string;
}

