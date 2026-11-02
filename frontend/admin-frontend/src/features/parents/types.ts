export interface LinkedChildDetail {
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

export interface ParentWithChildren {
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

export interface PaginatedParentsResponse {
  items: ParentWithChildren[];
  total: number;
  skip: number;
  limit: number;
}

export interface ParentCreatePayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  profile_image?: string;
  password?: string;
}

export interface ParentResponse {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  address?: string | null;
  profile_image?: string | null;
  user_status: string;
  created_at: string;
  initial_password?: string | null;
  login_identifier?: string | null;
}

export interface ParentUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  profile_image?: string;
}

export interface LinkChildPayload {
  student_id: string;
  relationship_type?: string;
  is_primary_guardian?: boolean;
}

export interface UpdateRelationshipPayload {
  relationship_type?: string;
  is_primary_guardian?: boolean;
  verification_status?: string;
  status?: string;
}

export interface LinkedParentDetail {
  relationship_id: string;
  parent_id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  relationship_type: string;
  is_primary_guardian: boolean;
  verification_status: string;
  status: string;
  linked_at: string;
}

