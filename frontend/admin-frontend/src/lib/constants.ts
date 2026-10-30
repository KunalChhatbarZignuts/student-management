export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ALLOWED_ROLES: UserRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.TEACHER,
];

export const STUDENT_PORTAL_ALLOWED_ROLES: UserRole[] = [
  ROLES.STUDENT,
  ROLES.PARENT,
];

export const API_BASE_URL = '/api/v1';
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Admin Portal';
