import apiClient from '@/lib/axios';

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
  status: string;
  published_at?: string;
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

  // Student / Parent specific states
  is_read_by_student?: boolean;
  is_acknowledged?: boolean;
  acknowledgement_id?: string;
  conversation_id?: string;
  target_student_id?: string;
  target_student_name?: string;
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

export const studentDiaryApi = {
  getStudentEntries: async (params?: {
    entry_type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: DiaryEntry[]; total: number }> => {
    const res = await apiClient.get<{ entries: DiaryEntry[]; total: number }>('/diary/student/entries', {
      params,
    });
    return res.data;
  },

  markAsRead: async (entryId: string): Promise<{ is_read: boolean }> => {
    const res = await apiClient.post<{ is_read: boolean }>(`/diary/student/entries/${entryId}/read`);
    return res.data;
  },

  getParentEntries: async (params?: {
    student_id?: string;
    entry_type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: DiaryEntry[]; total: number }> => {
    const res = await apiClient.get<{ entries: DiaryEntry[]; total: number }>('/diary/parent/entries', {
      params,
    });
    return res.data;
  },

  acknowledgeEntry: async (
    entryId: string,
    studentId: string,
    notes?: string
  ): Promise<{ id: string; parent_name: string; acknowledged_at: string }> => {
    const res = await apiClient.post(`/diary/parent/entries/${entryId}/acknowledge`, {
      student_id: studentId,
      notes: notes || undefined,
    });
    return res.data;
  },

  getOrCreateConversation: async (entryId: string, studentId: string): Promise<{ conversation_id: string }> => {
    const res = await apiClient.post(`/diary/conversations?entry_id=${entryId}&student_id=${studentId}`);
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
};
