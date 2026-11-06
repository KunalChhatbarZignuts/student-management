import { apiClient } from '@/lib/axios';

export interface AbsenceNotificationLogItem {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  grade_name: string;
  section_name: string;
  parent_id?: string | null;
  parent_name?: string | null;
  date: string;
  period: number;
  channel: string;
  recipient?: string | null;
  status: string;
  message: string;
  error_message?: string | null;
  sent_at: string;
}

export const absenceNotificationsApi = {
  getLogs: async (params?: {
    date?: string;
    student_id?: string;
    status?: string;
    limit?: number;
  }): Promise<AbsenceNotificationLogItem[]> => {
    const res = await apiClient.get<AbsenceNotificationLogItem[]>('/absence-notifications', {
      params,
    });
    return res.data;
  },

  dispatchSessionAlerts: async (sessionId: string) => {
    const res = await apiClient.post(`/absence-notifications/sessions/${sessionId}/dispatch`);
    return res.data;
  },
};

