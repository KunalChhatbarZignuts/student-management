import { apiClient } from '@/lib/axios';
import {
  AbsentTeacherCoverageResponse,
  SubstituteCandidate,
  SubstitutionCreateRequest,
  SubstitutionResponse,
} from './types';

export const substitutionApi = {
  getAbsentTeacherCoverage: async (
    teacherId: string,
    date: string
  ): Promise<AbsentTeacherCoverageResponse> => {
    const res = await apiClient.get<AbsentTeacherCoverageResponse>('/substitutions/coverage', {
      params: { teacher_id: teacherId, date },
    });
    return res.data;
  },

  getRecommendations: async (
    timetableEntryId: string,
    date: string
  ): Promise<SubstituteCandidate[]> => {
    const res = await apiClient.get<SubstituteCandidate[]>('/substitutions/recommendations', {
      params: { timetable_entry_id: timetableEntryId, date },
    });
    return res.data;
  },

  assignSubstitution: async (
    payload: SubstitutionCreateRequest
  ): Promise<SubstitutionResponse> => {
    const res = await apiClient.post<SubstitutionResponse>('/substitutions', payload);
    return res.data;
  },

  listSubstitutions: async (params?: {
    date?: string;
    teacher_id?: string;
    as_substitute?: boolean;
  }): Promise<SubstitutionResponse[]> => {
    const res = await apiClient.get<SubstitutionResponse[]>('/substitutions', { params });
    return res.data;
  },

  cancelSubstitution: async (
    substitutionId: string,
    reason?: string
  ): Promise<SubstitutionResponse> => {
    const res = await apiClient.post<SubstitutionResponse>(
      `/substitutions/${substitutionId}/cancel`,
      { reason }
    );
    return res.data;
  },
};

