import apiClient from '@/lib/axios';
import {
  FeeCalculationRequest,
  FeeCalculationResponse,
  FeeComponent,
  FeeComponentCreatePayload,
  FeeComponentUpdatePayload,
  FeeDashboardMetrics,
  FeeStructure,
  FeeStructureCreatePayload,
  FeeStructureListItem,
  PaginatedFeeAssignmentsResponse,
  StudentFeeAssignment,
  FeeReceipt,
  PaymentTransaction,
  PaginatedTransactionsResponse,
  PaymentWebhookEvent,
  PaginatedWebhookEventsResponse,
  RecordOfflinePaymentPayload,
  StudentFeeAdjustmentPayload,
} from './types';

export * from './types';

export const feeKeys = {
  all: ['fees'] as const,
  dashboard: () => [...feeKeys.all, 'dashboard'] as const,
  components: (filters?: Record<string, unknown>) => [...feeKeys.all, 'components', filters || {}] as const,
  structures: (filters?: Record<string, unknown>) => [...feeKeys.all, 'structures', filters || {}] as const,
  activeStructure: (gradeId: string, yearId: string) => [...feeKeys.all, 'active-structure', gradeId, yearId] as const,
  structureDetail: (id: string) => [...feeKeys.all, 'structure-detail', id] as const,
  assignments: (filters?: Record<string, unknown>) => [...feeKeys.all, 'assignments', filters || {}] as const,
  assignmentDetail: (id: string) => [...feeKeys.all, 'assignment-detail', id] as const,
  transactions: (filters?: Record<string, unknown>) => [...feeKeys.all, 'transactions', filters || {}] as const,
  webhooks: (filters?: Record<string, unknown>) => [...feeKeys.all, 'webhooks', filters || {}] as const,
  receipt: (number: string) => [...feeKeys.all, 'receipt', number] as const,
};

export const adminFeeApi = {
  getDashboardMetrics: async (): Promise<FeeDashboardMetrics> => {
    const res = await apiClient.get<FeeDashboardMetrics>('/admin/fees/dashboard');
    return res.data;
  },

  listComponents: async (params?: { status?: string; fee_type?: string }): Promise<FeeComponent[]> => {
    const res = await apiClient.get<FeeComponent[]>('/admin/fees/components', { params });
    return res.data;
  },

  createComponent: async (payload: FeeComponentCreatePayload): Promise<FeeComponent> => {
    const res = await apiClient.post<FeeComponent>('/admin/fees/components', payload);
    return res.data;
  },

  updateComponent: async (id: string, payload: FeeComponentUpdatePayload): Promise<FeeComponent> => {
    const res = await apiClient.put<FeeComponent>(`/admin/fees/components/${id}`, payload);
    return res.data;
  },

  toggleComponentStatus: async (id: string, status: 'active' | 'inactive'): Promise<FeeComponent> => {
    const res = await apiClient.patch<FeeComponent>(`/admin/fees/components/${id}/status`, null, {
      params: { status },
    });
    return res.data;
  },

  listStructures: async (params?: {
    academic_year_id?: string;
    grade_id?: string;
    status?: string;
  }): Promise<FeeStructureListItem[]> => {
    const res = await apiClient.get<FeeStructureListItem[]>('/admin/fees/structures', { params });
    return res.data;
  },

  getActiveStructure: async (gradeId: string, yearId: string): Promise<FeeStructure | null> => {
    try {
      const res = await apiClient.get<FeeStructure | null>('/admin/fees/structures/active', {
        params: { grade_id: gradeId, academic_year_id: yearId },
      });
      return res.data;
    } catch {
      return null;
    }
  },

  getStructureDetail: async (id: string): Promise<FeeStructure> => {
    const res = await apiClient.get<FeeStructure>(`/admin/fees/structures/${id}`);
    return res.data;
  },

  createStructure: async (payload: FeeStructureCreatePayload): Promise<FeeStructure> => {
    const res = await apiClient.post<FeeStructure>('/admin/fees/structures', payload);
    return res.data;
  },

  simulateCalculation: async (payload: FeeCalculationRequest): Promise<FeeCalculationResponse> => {
    const res = await apiClient.post<FeeCalculationResponse>('/admin/fees/simulate', payload);
    return res.data;
  },

  listAssignments: async (params?: {
    academic_year_id?: string;
    grade_id?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<PaginatedFeeAssignmentsResponse> => {
    const res = await apiClient.get<PaginatedFeeAssignmentsResponse>('/admin/fees/assignments', { params });
    return res.data;
  },

  getAssignmentDetail: async (id: string): Promise<StudentFeeAssignment> => {
    const res = await apiClient.get<StudentFeeAssignment>(`/admin/fees/assignments/${id}`);
    return res.data;
  },

  listTransactions: async (params?: {
    academic_year_id?: string;
    grade_id?: string;
    student_id?: string;
    status?: string;
    payment_method?: string;
    skip?: number;
    limit?: number;
  }): Promise<PaginatedTransactionsResponse> => {
    const res = await apiClient.get<PaginatedTransactionsResponse>('/admin/fees/transactions', { params });
    return res.data;
  },

  recordOfflinePayment: async (
    installmentId: string,
    payload: RecordOfflinePaymentPayload
  ): Promise<FeeReceipt> => {
    const res = await apiClient.post<FeeReceipt>(
      `/admin/fees/installments/${installmentId}/record-offline-payment`,
      payload
    );
    return res.data;
  },

  applyAdjustment: async (
    assignmentId: string,
    payload: StudentFeeAdjustmentPayload
  ): Promise<StudentFeeAssignment> => {
    const res = await apiClient.post<StudentFeeAssignment>(
      `/admin/fees/assignments/${assignmentId}/adjustments`,
      payload
    );
    return res.data;
  },

  listWebhooks: async (params?: {
    status?: string;
    event_type?: string;
    skip?: number;
    limit?: number;
  }): Promise<PaginatedWebhookEventsResponse> => {
    const res = await apiClient.get<PaginatedWebhookEventsResponse>('/admin/fees/webhooks', { params });
    return res.data;
  },

  retryWebhook: async (eventId: string): Promise<{ status: string; message: string }> => {
    const res = await apiClient.post<{ status: string; message: string }>(
      `/admin/fees/webhooks/${eventId}/retry`
    );
    return res.data;
  },

  getReceiptDetail: async (receiptNumber: string): Promise<FeeReceipt> => {
    const res = await apiClient.get<FeeReceipt>(`/fees/receipts/${receiptNumber}`);
    return res.data;
  },
};

