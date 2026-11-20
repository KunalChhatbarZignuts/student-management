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
  created_at: string;
  updated_at: string;
}

export interface PreJoinInfo {
  class_id: string;
  title: string;
  description: string | null;
  teacher_name: string;
  room_name: string;
  status: string;
  scheduled_date: string;
  start_time: string;
  can_join: boolean;
  block_reason: string | null;
  allow_student_mic: boolean;
  allow_student_cam: boolean;
  allow_student_chat: boolean;
  allow_student_whiteboard: boolean;
}

export interface OnlineClassListResponse {
  items: OnlineClass[];
  total: number;
  page: number;
  size: number;
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

export interface OnlineClassRecording {
  id: string;
  online_class_id?: string;
  class_id?: string;
  class_title: string;
  teacher_name: string;
  recording_date?: string;
  created_at?: string;
  duration_seconds: number;
  file_size_bytes: number;
  processing_status?: string;
  status?: string;
  stream_url?: string;
  playback_url?: string;
  thumbnail_url?: string;
}
