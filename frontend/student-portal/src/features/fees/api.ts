import apiClient from '@/lib/axios';
import {
  StudentPortalFeeScheduleResponse,
  PaymentOrderCreatePayload,
  PaymentOrderResponse,
  PaymentVerifyPayload,
  PaymentVerificationResponse,
  FeeReceiptDetail,
} from './types';

export const portalFeeApi = {
  // Student self fee schedule
  getMyFeeSchedule: async (): Promise<StudentPortalFeeScheduleResponse> => {
    const res = await apiClient.get<StudentPortalFeeScheduleResponse>('/student/fees/my-schedule');
    return res.data;
  },

  // Parent linked child fee schedule
  getChildFeeSchedule: async (studentId: string): Promise<StudentPortalFeeScheduleResponse> => {
    const res = await apiClient.get<StudentPortalFeeScheduleResponse>(`/parent/fees/child/${studentId}`);
    return res.data;
  },

  // Razorpay order creation
  createPaymentOrder: async (payload: PaymentOrderCreatePayload): Promise<PaymentOrderResponse> => {
    const res = await apiClient.post<PaymentOrderResponse>('/payments/create-order', payload);
    return res.data;
  },

  // Signature verification (client fallback)
  verifyPayment: async (payload: PaymentVerifyPayload): Promise<PaymentVerificationResponse> => {
    const res = await apiClient.post<PaymentVerificationResponse>('/payments/verify', payload);
    return res.data;
  },

  // Receipt detail view
  getReceiptDetail: async (receiptNumber: string): Promise<FeeReceiptDetail> => {
    const res = await apiClient.get<FeeReceiptDetail>(`/fees/receipts/${receiptNumber}`);
    return res.data;
  },
};

