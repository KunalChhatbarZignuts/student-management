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
};

