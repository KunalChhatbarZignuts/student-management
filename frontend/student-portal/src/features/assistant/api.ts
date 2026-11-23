import { apiClient } from '@/lib/axios';
import {
  ChatQueryResponse,
  ConversationDetail,
  ConversationSummary,
  SuggestionCard,
  QuizGenerationResponse,
  QuizAnswerItem,
  QuizEvaluationResponse,
  FlashcardDeckResponse,
  ExamPrepPlanResponse,
  ImageQuestionResponse,
  DocumentSummaryResponse,
  GrammarEvaluationResponse,
  DebateRoundResponse,
  ConceptMapResponse,
  ClassTopicNotesResponse,
  MorningBriefingResponse,
  DailyChallengeResponse,
  CareerDiscoveryResponse,
} from './types';

export const assistantKeys = {
  all: ['student-assistant'] as const,
  conversations: () => [...assistantKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...assistantKeys.all, 'conversation', id] as const,
  suggestions: () => [...assistantKeys.all, 'suggestions'] as const,
  examPrep: (subject?: string) => [...assistantKeys.all, 'exam-prep', subject || 'all'] as const,
  briefing: () => [...assistantKeys.all, 'briefing'] as const,
  dailyChallenge: () => [...assistantKeys.all, 'daily-challenge'] as const,
  careerDiscovery: (interests?: string) => [...assistantKeys.all, 'career-discovery', interests || 'all'] as const,
};

export const assistantApi = {
  sendMessage: async (
    message: string,
    conversationId?: string | null
  ): Promise<ChatQueryResponse> => {
    const res = await apiClient.post<ChatQueryResponse>('/student/assistant/chat', {
      message,
      conversation_id: conversationId || null,
      stream: false,
    });
    return res.data;
  },

  getConversations: async (): Promise<ConversationSummary[]> => {
    const res = await apiClient.get<ConversationSummary[]>('/student/assistant/conversations');
    return res.data;
  },

  createConversation: async (title?: string): Promise<ConversationSummary> => {
    const res = await apiClient.post<ConversationSummary>('/student/assistant/conversations', {
      title: title || 'New Conversation',
    });
    return res.data;
  },

  getConversationDetail: async (conversationId: string): Promise<ConversationDetail> => {
    const res = await apiClient.get<ConversationDetail>(
      `/student/assistant/conversations/${conversationId}`
    );
    return res.data;
  },

  renameConversation: async (
    conversationId: string,
    title: string
  ): Promise<{ status: string; title: string }> => {
    const res = await apiClient.patch<{ status: string; title: string }>(
      `/student/assistant/conversations/${conversationId}`,
      { title }
    );
    return res.data;
  },

  deleteConversation: async (conversationId: string): Promise<{ status: string }> => {
    const res = await apiClient.delete<{ status: string }>(
      `/student/assistant/conversations/${conversationId}`
    );
    return res.data;
  },

  getSuggestions: async (): Promise<SuggestionCard[]> => {
    const res = await apiClient.get<SuggestionCard[]>('/student/assistant/suggestions');
    return res.data;
  },

  // Release 2 Methods
  uploadImage: async (file: File): Promise<ImageQuestionResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ImageQuestionResponse>(
      '/student/assistant/upload-image',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  uploadDocument: async (file: File): Promise<DocumentSummaryResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<DocumentSummaryResponse>(
      '/student/assistant/upload-document',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  generateQuiz: async (
    subjectName: string,
    chapterTitle?: string,
    difficulty: string = 'MEDIUM',
    questionCount: number = 3
  ): Promise<QuizGenerationResponse> => {
    const res = await apiClient.post<QuizGenerationResponse>(
      '/student/assistant/quiz/generate',
      {
        subject_name: subjectName,
        chapter_title: chapterTitle || null,
        difficulty,
        question_count: questionCount,
      }
    );
    return res.data;
  },

  evaluateQuiz: async (
    quizId: string,
    answers: QuizAnswerItem[]
  ): Promise<QuizEvaluationResponse> => {
    const res = await apiClient.post<QuizEvaluationResponse>(
      '/student/assistant/quiz/evaluate',
      {
        quiz_id: quizId,
        answers,
      }
    );
    return res.data;
  },

  generateFlashcards: async (
    subjectName: string,
    chapterTitle?: string,
    cardCount: number = 4
  ): Promise<FlashcardDeckResponse> => {
    const res = await apiClient.post<FlashcardDeckResponse>(
      '/student/assistant/flashcards/generate',
      null,
      {
        params: {
          subject_name: subjectName,
          chapter_title: chapterTitle,
          card_count: cardCount,
        },
      }
    );
    return res.data;
  },

  getExamPrep: async (subjectName?: string): Promise<ExamPrepPlanResponse> => {
    const res = await apiClient.get<ExamPrepPlanResponse>(
      '/student/assistant/exam-prep',
      {
        params: subjectName ? { subject_name: subjectName } : {},
      }
    );
    return res.data;
  },

  getHomeworkHint: async (problemText: string): Promise<{ problem: string; guidance: string; method: string }> => {
    const res = await apiClient.post<{ problem: string; guidance: string; method: string }>(
      '/student/assistant/homework-hint',
      null,
      {
        params: { problem_text: problemText },
      }
    );
    return res.data;
  },

  // Release 3 Methods: Interactive AI
  evaluateGrammar: async (studentText: string, targetGradeLevel?: string): Promise<GrammarEvaluationResponse> => {
    const res = await apiClient.post<GrammarEvaluationResponse>(
      '/student/assistant/language/evaluate',
      {
        student_text: studentText,
        target_grade_level: targetGradeLevel || null,
      }
    );
    return res.data;
  },

  submitDebateRound: async (
    topic: string,
    stance: string,
    currentRound: number,
    studentArgument: string
  ): Promise<DebateRoundResponse> => {
    const res = await apiClient.post<DebateRoundResponse>(
      '/student/assistant/debate/round',
      {
        topic,
        stance,
        current_round: currentRound,
        student_argument: studentArgument,
      }
    );
    return res.data;
  },

  getConceptMap: async (topic: string, subjectName?: string): Promise<ConceptMapResponse> => {
    const res = await apiClient.get<ConceptMapResponse>(
      '/student/assistant/concept-map',
      {
        params: { topic, subject_name: subjectName || undefined },
      }
    );
    return res.data;
  },

  getClassNotes: async (subjectName?: string): Promise<ClassTopicNotesResponse> => {
    const res = await apiClient.get<ClassTopicNotesResponse>(
      '/student/assistant/class-notes',
      {
        params: subjectName ? { subject_name: subjectName } : {},
      }
    );
    return res.data;
  },

  // Release 4 Methods: Proactive AI
  getMorningBriefing: async (): Promise<MorningBriefingResponse> => {
    const res = await apiClient.get<MorningBriefingResponse>('/student/assistant/briefing');
    return res.data;
  },

  getDailyChallenge: async (): Promise<DailyChallengeResponse> => {
    const res = await apiClient.get<DailyChallengeResponse>('/student/assistant/daily-challenge');
    return res.data;
  },

  getCareerDiscovery: async (interests?: string): Promise<CareerDiscoveryResponse> => {
    const res = await apiClient.get<CareerDiscoveryResponse>(
      '/student/assistant/career-discovery',
      {
        params: interests ? { interests } : {},
      }
    );
    return res.data;
  },
};

