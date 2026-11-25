import apiClient from '@/lib/axios';

export interface DiaryRecipient {
  id: string;
  student_id: string;
  student_name: string;
  student_code?: string;
  class_name?: string;
  section_name?: string;
  is_read: boolean;
  read_at?: string;
  is_acknowledged: boolean;
  acknowledged_at?: string;
  parent_name?: string;
}

export interface DiaryEntry {
  id: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  description: string;
  entry_type: string;
  category?: string;
  entry_date: string;
  due_date?: string;
  visibility: string;
  requires_acknowledgement: boolean;
  is_conversation_allowed: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'RETRACTED';
  published_at?: string;
  retracted_at?: string;
  retraction_reason?: string;
  grade_id?: string;
  grade_name?: string;
  section_id?: string;
  section_name?: string;
  subject_id?: string;
  subject_name?: string;
  attachments: Array<{ name: string; url: string; file_type?: string; file_size?: number }>;
  created_at: string;
  updated_at: string;
  internal_notes?: string;
  total_recipients: number;
  read_count: number;
  acknowledged_count: number;
}

export interface DiaryMessage {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_role: string;
  sender_name: string;
  message: string;
  attachments: Array<any>;
  is_read: boolean;
  created_at: string;
}

export interface DiaryConversation {
  id: string;
  diary_entry_id: string;
  entry_title: string;
  student_id: string;
  student_name: string;
  parent_id: string;
  parent_name: string;
  teacher_id: string;
  teacher_name: string;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  resolved_at?: string;
  resolved_by_name?: string;
  resolution_notes?: string;
  created_at: string;
  messages: DiaryMessage[];
  unread_count: number;
}

export interface TeacherContext {
  is_admin: boolean;
  sections: Array<{ id: string; name: string; grade_id?: string; grade_name?: string }>;
  subjects: Array<{ id: string; name: string; code: string }>;
  students: Array<{ id: string; name: string; section_id?: string; student_code: string; class_name?: string; section_name?: string }>;
}

export interface CreateDiaryEntryPayload {
  title: string;
  description: string;
  entry_type: string;
  category?: string;
  entry_date: string;
  due_date?: string;
  grade_id?: string;
  section_id?: string;
  subject_id?: string;
  visibility: string;
  requires_acknowledgement: boolean;
  is_conversation_allowed: boolean;
  status: string;
  internal_notes?: string;
  attachments?: Array<any>;
  student_ids?: string[];
}

export const diaryApi = {
  getTeacherContext: async (): Promise<TeacherContext> => {
    const res = await apiClient.get<TeacherContext>('/diary/teacher-context');
    return res.data;
  },

  listTeacherEntries: async (params?: {
    status?: string;
    entry_type?: string;
    section_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: DiaryEntry[]; total: number }> => {
    const res = await apiClient.get<{ entries: DiaryEntry[]; total: number }>('/diary/entries', {
      params,
    });
    return res.data;
  },

  createDiaryEntry: async (payload: CreateDiaryEntryPayload): Promise<{ id: string; status: string }> => {
    const res = await apiClient.post<{ id: string; status: string }>('/diary/entries', payload);
    return res.data;
  },

  updateDiaryEntry: async (id: string, payload: Partial<CreateDiaryEntryPayload>): Promise<{ id: string; status: string }> => {
    const res = await apiClient.put<{ id: string; status: string }>(`/diary/entries/${id}`, payload);
    return res.data;
  },

  publishDiaryEntry: async (id: string): Promise<{ id: string; status: string }> => {
    const res = await apiClient.post<{ id: string; status: string }>(`/diary/entries/${id}/publish`);
    return res.data;
  },

  retractDiaryEntry: async (id: string, reason: string): Promise<{ id: string; status: string }> => {
    const res = await apiClient.post<{ id: string; status: string }>(`/diary/entries/${id}/retract`, { reason });
    return res.data;
  },

  deleteDiaryEntry: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/diary/entries/${id}`);
    return res.data;
  },

  getEntryRecipients: async (id: string): Promise<DiaryRecipient[]> => {
    const res = await apiClient.get<DiaryRecipient[]>(`/diary/entries/${id}/recipients`);
    return res.data;
  },

  getConversationDetails: async (convId: string): Promise<DiaryConversation> => {
    const res = await apiClient.get<DiaryConversation>(`/diary/conversations/${convId}`);
    return res.data;
  },

  postConversationMessage: async (convId: string, message: string): Promise<DiaryMessage> => {
    const res = await apiClient.post<DiaryMessage>(`/diary/conversations/${convId}/messages`, {
      message,
      attachments: [],
    });
    return res.data;
  },

  resolveConversation: async (convId: string, resolutionNotes?: string, close = false): Promise<{ status: string }> => {
    const res = await apiClient.post<{ status: string }>(`/diary/conversations/${convId}/resolve?close=${close}`, {
      resolution_notes: resolutionNotes,
    });
    return res.data;
  },
};
