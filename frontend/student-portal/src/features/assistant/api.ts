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

  sendMessageStream: async (
    message: string,
    conversationId: string | null | undefined,
    callbacks: {
      onMetadata?: (data: { conversation_id: string; message_id: string }) => void;
      onToolStart?: (data: { tool: string }) => void;
      onToken?: (text: string) => void;
      onDone?: (data: { message_id?: string; action_links?: Array<{ label: string; url: string }>; tools_used?: string[] }) => void;
      onError?: (err: any) => void;
    },
    signal?: AbortSignal
  ): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseURL}/student/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId || null,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const block of parts) {
        if (!block.trim()) continue;
        const eventMatch = block.match(/event:\s*(\w+)/);
        const dataPrefixIdx = block.indexOf('data:');
        if (!eventMatch || dataPrefixIdx === -1) continue;

        const eventType = eventMatch[1];
        const rawData = block.substring(dataPrefixIdx + 5).trim();
        try {
          const parsed = JSON.parse(rawData);
          if (eventType === 'metadata' && callbacks.onMetadata) {
            callbacks.onMetadata(parsed);
          } else if (eventType === 'tool_start' && callbacks.onToolStart) {
            callbacks.onToolStart(parsed);
          } else if (eventType === 'token' && callbacks.onToken) {
            callbacks.onToken(parsed.text);
          } else if (eventType === 'done' && callbacks.onDone) {
            callbacks.onDone(parsed);
          } else if (eventType === 'error' && callbacks.onError) {
            callbacks.onError(parsed);
          }
        } catch (e) {
          console.error('Failed to parse SSE event data:', e);
        }
      }
    }
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
    const res = await apiClient.get<SuggestionCard[]>('/student/assistant/insights', {
      params: { type: 'suggestions' },
    });
    return res.data;
  },

  // Consolidated Action Dispatcher
  executeAction: async <T = any>(action: string, payload: Record<string, any> = {}): Promise<T> => {
    const res = await apiClient.post<T>('/student/assistant/action', {
      action,
      payload,
    });
    return res.data;
  },

  // Release 2 Methods: Academic Intelligence
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
    return assistantApi.executeAction<QuizGenerationResponse>('quiz_generate', {
      subject_name: subjectName,
      chapter_title: chapterTitle || null,
      difficulty,
      question_count: questionCount,
    });
  },

  evaluateQuiz: async (
    quizId: string,
    answers: QuizAnswerItem[]
  ): Promise<QuizEvaluationResponse> => {
    return assistantApi.executeAction<QuizEvaluationResponse>('quiz_evaluate', {
      quiz_id: quizId,
      answers,
    });
  },

  generateFlashcards: async (
    subjectName: string,
    chapterTitle?: string,
    cardCount: number = 4
  ): Promise<FlashcardDeckResponse> => {
    return assistantApi.executeAction<FlashcardDeckResponse>('flashcards', {
      subject_name: subjectName,
      chapter_title: chapterTitle,
      card_count: cardCount,
    });
  },

  getExamPrep: async (subjectName?: string): Promise<ExamPrepPlanResponse> => {
    const res = await apiClient.get<ExamPrepPlanResponse>(
      '/student/assistant/insights',
      {
        params: { type: 'exam-prep', subject: subjectName || undefined },
      }
    );
    return res.data;
  },

  getHomeworkHint: async (problemText: string): Promise<{ problem: string; guidance: string; method: string }> => {
    return assistantApi.executeAction<{ problem: string; guidance: string; method: string }>('homework_hint', {
      problem_text: problemText,
    });
  },

  // Release 3 Methods: Interactive AI
  evaluateGrammar: async (studentText: string, targetGradeLevel?: string): Promise<GrammarEvaluationResponse> => {
    return assistantApi.executeAction<GrammarEvaluationResponse>('language_eval', {
      student_text: studentText,
      target_grade_level: targetGradeLevel || null,
    });
  },

  submitDebateRound: async (
    topic: string,
    stance: string,
    currentRound: number,
    studentArgument: string
  ): Promise<DebateRoundResponse> => {
    return assistantApi.executeAction<DebateRoundResponse>('debate_round', {
      topic,
      stance,
      current_round: currentRound,
      student_argument: studentArgument,
    });
  },

  getConceptMap: async (topic: string, subjectName?: string): Promise<ConceptMapResponse> => {
    const res = await apiClient.get<ConceptMapResponse>(
      '/student/assistant/insights',
      {
        params: { type: 'concept-map', topic, subject: subjectName || undefined },
      }
    );
    return res.data;
  },

  getClassNotes: async (subjectName?: string): Promise<ClassTopicNotesResponse> => {
    const res = await apiClient.get<ClassTopicNotesResponse>(
      '/student/assistant/insights',
      {
        params: { type: 'class-notes', subject: subjectName || undefined },
      }
    );
    return res.data;
  },

  // Release 4 Methods: Proactive AI
  getMorningBriefing: async (): Promise<MorningBriefingResponse> => {
    const res = await apiClient.get<MorningBriefingResponse>('/student/assistant/insights', {
      params: { type: 'briefing' },
    });
    return res.data;
  },

  getDailyChallenge: async (): Promise<DailyChallengeResponse> => {
    const res = await apiClient.get<DailyChallengeResponse>('/student/assistant/insights', {
      params: { type: 'daily-challenge' },
    });
    return res.data;
  },

  getCareerDiscovery: async (interests?: string): Promise<CareerDiscoveryResponse> => {
    const res = await apiClient.get<CareerDiscoveryResponse>(
      '/student/assistant/insights',
      {
        params: { type: 'career-discovery', interests: interests || undefined },
      }
    );
    return res.data;
  },

  transcribeAudio: async (audioBlob: Blob): Promise<{ transcript: string; confidence: number; source: string }> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice_input.webm');
    const res = await apiClient.post<{ transcript: string; confidence: number; source: string }>(
      '/student/assistant/transcribe-audio',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return res.data;
  },
};

