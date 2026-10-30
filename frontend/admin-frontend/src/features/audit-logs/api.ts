import apiClient from '@/lib/axios';

export interface AuditLogItem {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  skip: number;
  limit: number;
}

export const adminAuditApi = {
  listLogs: async (params?: {
    action?: string;
    actor_email?: string;
    skip?: number;
    limit?: number;
  }): Promise<AuditLogsResponse> => {
    const res = await apiClient.get<AuditLogsResponse>('/admin/audit-logs', { params });
    return res.data;
  },
};
