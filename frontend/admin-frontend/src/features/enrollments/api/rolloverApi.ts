import { apiClient } from '@/lib/axios';

export interface RolloverCohortMappingItem {
  source_grade_id: string;
  source_grade_name: string;
  target_grade_id?: string | null;
  target_grade_name?: string | null;
  student_count: number;
  target_sections_available: number;
  fee_structure_configured: boolean;
}

export interface RolloverPreviewResponse {
  source_year_id: string;
  source_year_name: string;
  target_year_id: string;
  target_year_name: string;
  total_active_students: number;
  cohort_mappings: RolloverCohortMappingItem[];
  is_ready_to_rollover: boolean;
  warnings: string[];
}

export interface RolloverGradeMappingInput {
  source_grade_id: string;
  target_grade_id?: string | null;
  default_target_section_id?: string | null;
}

export interface RolloverExecutionRequest {
  source_year_id: string;
  target_year_id: string;
  grade_mappings: RolloverGradeMappingInput[];
  student_overrides?: Array<{
    student_id: string;
    action: string;
    target_section_id?: string;
  }>;
  auto_assign_base_fees: boolean;
}

export interface RolloverExecutionResponse {
  source_year_id: string;
  target_year_id: string;
  total_processed: number;
  promoted_count: number;
  repeated_count: number;
  graduated_left_count: number;
  fee_assignments_created_count: number;
  executed_at: string;
  status: string;
}

export const rolloverApi = {
  getPreview: async (sourceYearId: string, targetYearId: string): Promise<RolloverPreviewResponse> => {
    const res = await apiClient.get<RolloverPreviewResponse>('/rollover/preview', {
      params: { source_year_id: sourceYearId, target_year_id: targetYearId },
    });
    return res.data;
  },

  executeRollover: async (payload: RolloverExecutionRequest): Promise<RolloverExecutionResponse> => {
    const res = await apiClient.post<RolloverExecutionResponse>('/rollover/execute', payload);
    return res.data;
  },
};

