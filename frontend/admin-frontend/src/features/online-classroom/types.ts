export interface OnlineClass {
  id: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  description: string | null;
  room_name: string;
  scheduled_date: string;
  start_time: string;
  expected_duration_minutes: number;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  is_recording_enabled: boolean;
  allow_student_mic: boolean;
  allow_student_cam: boolean;
  allow_student_chat: boolean;
  allow_student_whiteboard: boolean;
  participant_count: number;
  live_participants_count?: number;
  is_room_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnlineClassParticipant {
  id: string;
  student_id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  status: string;
}

export interface OnlineClassDetail extends OnlineClass {
  participants: OnlineClassParticipant[];
  recording_count: number;
  latest_session_id: string | null;
}

export interface OnlineClassListResponse {
  items: OnlineClass[];
  total: number;
  page: number;
  size: number;
}

export interface OnlineClassStats {
  total_classes: number;
  upcoming_classes: number;
  live_classes: number;
  completed_classes: number;
  cancelled_classes: number;
  total_recordings: number;
  total_participants: number;
}

export interface CreateOnlineClassPayload {
  title: string;
  description?: string;
  scheduled_date: string;
  start_time: string;
  expected_duration_minutes: number;
  student_ids?: string[];
  is_recording_enabled?: boolean;
  allow_student_mic?: boolean;
  allow_student_cam?: boolean;
  allow_student_chat?: boolean;
  allow_student_whiteboard?: boolean;
  settings?: Record<string, any>;
}

export interface UpdateOnlineClassPayload {
  title?: string;
  description?: string;
  scheduled_date?: string;
  start_time?: string;
  expected_duration_minutes?: number;
  student_ids?: string[];
  is_recording_enabled?: boolean;
  allow_student_mic?: boolean;
  allow_student_cam?: boolean;
  allow_student_chat?: boolean;
  allow_student_whiteboard?: boolean;
  settings?: Record<string, any>;
}

export interface MeetingTokenResponse {
  token: string;
  livekit_url: string;
  room_name: string;
  participant_identity: string;
  participant_name: string;
  participant_role: string;
  expires_at: string;
}

export interface ClassRecording {
  id: string;
  online_class_id: string;
  class_title: string;
  teacher_name: string;
  file_name: string;
  file_size_bytes: number;
  duration_seconds: number;
  processing_status: 'READY' | 'PROCESSING' | 'ARCHIVED' | 'FAILED';
  is_published: boolean;
  retention_until?: string | null;
  created_at: string;
  stream_url?: string;
}

export interface RecordingListResponse {
  items: ClassRecording[];
  total: number;
  page: number;
  size: number;
}
