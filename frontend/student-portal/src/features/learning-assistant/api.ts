import { apiClient } from '@/lib/axios';
import {
  LearningOverview,
  SubjectLearningDetail,
  Recommendation,
  DailyStudyPlan,
  PracticeSession,
  PracticeEvaluation,
} from './types';

export const learningAssistantApi = {
  getOverview: async (): Promise<LearningOverview> => {
    const res = await apiClient.get<LearningOverview>('/students/me/learning-assistant/overview');
    return res.data;
  },

  getSubjects: async (): Promise<SubjectLearningDetail[]> => {
    const res = await apiClient.get<SubjectLearningDetail[]>('/students/me/learning-assistant/subjects');
    return res.data;
  },

  getLearningPath: async (): Promise<Recommendation[]> => {
    const res = await apiClient.get<Recommendation[]>('/students/me/learning-assistant/learning-path');
    return res.data;
  },

  recalculateLearningPath: async (): Promise<Recommendation[]> => {
    const res = await apiClient.post<Recommendation[]>('/students/me/learning-assistant/learning-path/recalculate');
    return res.data;
  },

  updateRecommendationStatus: async (
    recommendationId: string,
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'NEED_PRACTICE'
  ): Promise<Recommendation> => {
    const res = await apiClient.patch<Recommendation>(
      `/students/me/learning-assistant/learning-path/recommendations/${recommendationId}/status`,
      { status }
    );
    return res.data;
  },

  getDailyPlan: async (): Promise<DailyStudyPlan> => {
    const res = await apiClient.get<DailyStudyPlan>('/students/me/learning-assistant/daily-plan');
    return res.data;
  },

  updateDailyPlanItem: async (
    itemId: string,
    payload: { is_completed?: boolean; additional_seconds_spent?: number }
  ): Promise<DailyStudyPlan> => {
    const res = await apiClient.patch<DailyStudyPlan>(
      `/students/me/learning-assistant/daily-plan/items/${itemId}`,
      payload
    );
    return res.data;
  },

  addDailyPlanItem: async (payload: {
    subject_name: string;
    topic_title: string;
    duration_minutes?: number;
    activity_type?: string;
  }): Promise<DailyStudyPlan> => {
    const res = await apiClient.post<DailyStudyPlan>(
      '/students/me/learning-assistant/daily-plan/items',
      payload
    );
    return res.data;
  },

  generatePractice: async (payload: {
    chapter_id?: string;
    subject_id?: string;
    difficulty?: string;
    num_questions?: number;
  }): Promise<PracticeSession> => {
    const res = await apiClient.post<PracticeSession>(
      '/students/me/learning-assistant/practice/generate',
      payload
    );
    return res.data;
  },

  submitPractice: async (
    sessionId: string,
    answers: Array<{ question_id: string; selected_option_index: number }>
  ): Promise<PracticeEvaluation> => {
    const res = await apiClient.post<PracticeEvaluation>(
      `/students/me/learning-assistant/practice/${sessionId}/submit`,
      { answers }
    );
    return res.data;
  },

  sendChatMessage: async (message: string) => {
    const res = await apiClient.post<{
      reply: string;
      suggested_actions?: Array<{ label: string; action_type: string; target_id?: string | null }>;
      timestamp: string;
    }>('/students/me/learning-assistant/chat', { message });
    return res.data;
  },
};

export const learningAssistantKeys = {
  all: ['learning-assistant'] as const,
  overview: () => [...learningAssistantKeys.all, 'overview'] as const,
  subjects: () => [...learningAssistantKeys.all, 'subjects'] as const,
  learningPath: () => [...learningAssistantKeys.all, 'learning-path'] as const,
  dailyPlan: () => [...learningAssistantKeys.all, 'daily-plan'] as const,
};
