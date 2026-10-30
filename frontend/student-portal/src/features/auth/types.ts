import { UserRole } from '@/lib/constants';

export interface StudentProfileData {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  dob: string;
  class_name: string;
  section: string;
  department: string;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  admission_date: string;
  status: string;
}

export interface TeacherProfileData {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  department: string;
  phone?: string | null;
}

export interface ParentProfileData {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  must_change_password: boolean;
  totp_enabled: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  student?: StudentProfileData | null;
  teacher?: TeacherProfileData | null;
  parent?: ParentProfileData | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  must_change_password?: boolean;
  requires_2fa?: boolean;
  temp_token?: string | null;
}

export interface MessageResponse {
  message: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauth_url: string;
}
