import { AttendanceSummary, StudentMark, FeeInvoice } from '../academic/api';

export interface LinkedChildDetail {
  id: string;
  relationship_id: string;
  student_id: string;
  student_code: string;
  enrollment_number?: string | null;
  first_name: string;
  last_name: string;
  dob?: string | null;
  class_name: string;
  section: string;
  department?: string | null;
  academic_year?: string | null;
  class_teacher_name?: string | null;
  relationship_type: string;
  is_primary_guardian: boolean;
  verification_status: string;
  status: string;
  linked_at: string;
}

export type ChildStudent = LinkedChildDetail;

export interface ParentProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  address?: string | null;
  profile_image?: string | null;
  user_status: string;
  children_count: number;
  children: LinkedChildDetail[];
  created_at: string;
}

export interface ParentProfileUpdate {
  first_name: string;
  last_name: string;
  phone?: string | null;
  address?: string | null;
  profile_image?: string | null;
}

export interface ParentNotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  created_at: string;
  is_read: boolean;
}

export interface TimetableScheduleItem {
  subject: string;
  subject_code: string;
  teacher: string;
  assignment_type: string;
  schedule: string;
}

export interface ChildTimetableResponse {
  student_id: string;
  student_name: string;
  class_name: string;
  section: string;
  schedule: TimetableScheduleItem[];
}

export interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  status: string;
}

export interface ChildAssignmentsResponse {
  student_id: string;
  student_name: string;
  class_name: string;
  section: string;
  assignments: AssignmentItem[];
}
