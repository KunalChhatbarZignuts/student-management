import { apiClient } from '@/lib/axios';
import {
  POSCollectPaymentRequest,
  POSPaymentReceiptResponse,
  POSStudentAccountDetails,
  POSStudentSearchItem,
} from '../types/pos';

export const feePosApi = {
  searchStudents: async (query: string): Promise<POSStudentSearchItem[]> => {
    const res = await apiClient.get<POSStudentSearchItem[]>('/pos/students', {
      params: { query },
    });
    return res.data;
  },

  getStudentAccountDetails: async (studentId: string): Promise<POSStudentAccountDetails> => {
    const res = await apiClient.get<POSStudentAccountDetails>(`/pos/students/${studentId}/details`);
    return res.data;
  },

  collectPayment: async (
    payload: POSCollectPaymentRequest
  ): Promise<POSPaymentReceiptResponse> => {
    const res = await apiClient.post<POSPaymentReceiptResponse>('/pos/collect', payload);
    return res.data;
  },

  getReceiptDetails: async (receiptNumber: string): Promise<POSPaymentReceiptResponse> => {
    const res = await apiClient.get<POSPaymentReceiptResponse>(`/pos/receipts/${receiptNumber}`);
    return res.data;
  },

  getReceiptPdfUrl: (receiptNumber: string): string => {
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/v1/pos/receipts/${receiptNumber}/pdf`;
  },
};

