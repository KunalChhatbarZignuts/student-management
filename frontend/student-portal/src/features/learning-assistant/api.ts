import { apiClient } from '@/lib/axios';
import {
  LearningOverview,
  SubjectLearningDetail,
  Recommendation,
  DailyStudyPlan,
  PracticeSession,
  PracticeEvaluation,
  StudentStudySettings,
  WeeklyStudyPlan,
  TopicMasteryMatrix,
  StudentMistake,
  ConceptTutorExplainResponse,
  StudySession,
  CreateRoutineActivityPayload,
  UpdateRoutineActivityPayload,
  UpdateActivityStatusPayload,
  DuplicateRoutinePayload,
  StartSessionPayload,
  FinishSessionPayload,
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

  getWeeklyPlan: async (weekStart?: string): Promise<WeeklyStudyPlan> => {
    const params = weekStart ? { week_start: weekStart } : {};
    const res = await apiClient.get<WeeklyStudyPlan>('/students/me/learning-assistant/weekly-plan', { params });
    return res.data;
  },

  getSettings: async (): Promise<StudentStudySettings> => {
    const res = await apiClient.get<StudentStudySettings>('/students/me/learning-assistant/settings');
    return res.data;
  },

  updateSettings: async (payload: Partial<StudentStudySettings>): Promise<StudentStudySettings> => {
    const res = await apiClient.put<StudentStudySettings>('/students/me/learning-assistant/settings', payload);
    return res.data;
  },

  rescheduleDailyPlanItem: async (itemId: string, targetDate?: string): Promise<DailyStudyPlan> => {
    const res = await apiClient.post<DailyStudyPlan>(
      `/students/me/learning-assistant/daily-plan/items/${itemId}/reschedule`,
      { target_date: targetDate }
    );
    return res.data;
  },

  getDailyRoutine: async (planDate?: string): Promise<DailyStudyPlan> => {
    const params = planDate ? { plan_date: planDate } : {};
    const res = await apiClient.get<DailyStudyPlan>('/students/me/learning-assistant/daily-routine', { params });
    return res.data;
  },

  createRoutineActivity: async (payload: CreateRoutineActivityPayload): Promise<DailyStudyPlan> => {
    const res = await apiClient.post<DailyStudyPlan>('/students/me/learning-assistant/daily-routine/activities', payload);
    return res.data;
  },

  updateRoutineActivity: async (activityId: string, payload: UpdateRoutineActivityPayload): Promise<DailyStudyPlan> => {
    const res = await apiClient.put<DailyStudyPlan>(
      `/students/me/learning-assistant/daily-routine/activities/${activityId}`,
      payload
    );
    return res.data;
  },

  updateActivityStatus: async (activityId: string, payload: UpdateActivityStatusPayload): Promise<DailyStudyPlan> => {
    const res = await apiClient.patch<DailyStudyPlan>(
      `/students/me/learning-assistant/daily-routine/activities/${activityId}/status`,
      payload
    );
    return res.data;
  },

  deleteRoutineActivity: async (activityId: string): Promise<DailyStudyPlan> => {
    const res = await apiClient.delete<DailyStudyPlan>(
      `/students/me/learning-assistant/daily-routine/activities/${activityId}`
    );
    return res.data;
  },

  reorderRoutineActivities: async (itemIds: string[]): Promise<DailyStudyPlan> => {
    const res = await apiClient.put<DailyStudyPlan>(
      '/students/me/learning-assistant/daily-routine/activities-reorder',
      { item_ids: itemIds }
    );
    return res.data;
  },

  duplicateRoutine: async (payload: DuplicateRoutinePayload): Promise<DailyStudyPlan> => {
    const res = await apiClient.post<DailyStudyPlan>('/students/me/learning-assistant/daily-routine/duplicate', payload);
    return res.data;
  },

  updateRoutineMetadata: async (payload: { notes?: string; is_archived?: boolean }, planDate?: string): Promise<DailyStudyPlan> => {
    const params = planDate ? { plan_date: planDate } : {};
    const res = await apiClient.patch<DailyStudyPlan>(
      '/students/me/learning-assistant/daily-routine/metadata',
      payload,
      { params }
    );
    return res.data;
  },

  getActiveStudySession: async (): Promise<StudySession | null> => {
    const res = await apiClient.get<StudySession | null>('/students/me/learning-assistant/study-sessions/active');
    return res.data;
  },

  startStudySession: async (payload: StartSessionPayload): Promise<StudySession> => {
    const res = await apiClient.post<StudySession>('/students/me/learning-assistant/study-sessions/start', payload);
    return res.data;
  },

  pauseStudySession: async (sessionId: string): Promise<StudySession> => {
    const res = await apiClient.post<StudySession>(`/students/me/learning-assistant/study-sessions/${sessionId}/pause`);
    return res.data;
  },

  resumeStudySession: async (sessionId: string): Promise<StudySession> => {
    const res = await apiClient.post<StudySession>(`/students/me/learning-assistant/study-sessions/${sessionId}/resume`);
    return res.data;
  },

  finishStudySession: async (sessionId: string, payload: FinishSessionPayload): Promise<StudySession> => {
    const res = await apiClient.post<StudySession>(
      `/students/me/learning-assistant/study-sessions/${sessionId}/finish`,
      payload
    );
    return res.data;
  },

  cancelStudySession: async (sessionId: string): Promise<StudySession> => {
    const res = await apiClient.post<StudySession>(`/students/me/learning-assistant/study-sessions/${sessionId}/cancel`);
    return res.data;
  },

  getMasteryMatrix: async (): Promise<TopicMasteryMatrix> => {
    const res = await apiClient.get<TopicMasteryMatrix>('/students/me/learning-assistant/mastery');
    return res.data;
  },

  getMistakes: async (): Promise<StudentMistake[]> => {
    const res = await apiClient.get<StudentMistake[]>('/students/me/learning-assistant/mistakes');
    return res.data;
  },

  resolveMistake: async (mistakeId: string, isResolved: boolean = true): Promise<StudentMistake> => {
    const res = await apiClient.patch<StudentMistake>(
      `/students/me/learning-assistant/mistakes/${mistakeId}/resolve`,
      { is_resolved: isResolved }
    );
    return res.data;
  },

  explainConcept: async (payload: {
    subject_name: string;
    topic_title: string;
    chapter_title?: string;
    specific_question?: string;
  }): Promise<ConceptTutorExplainResponse> => {
    const res = await apiClient.post<ConceptTutorExplainResponse>(
      '/students/me/learning-assistant/tutor/explain',
      payload
    );
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
  weeklyPlan: (weekStart?: string) => [...learningAssistantKeys.all, 'weekly-plan', weekStart || 'current'] as const,
  settings: () => [...learningAssistantKeys.all, 'settings'] as const,
  mastery: () => [...learningAssistantKeys.all, 'mastery'] as const,
  mistakes: () => [...learningAssistantKeys.all, 'mistakes'] as const,
};
