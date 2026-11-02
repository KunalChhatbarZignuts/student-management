import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parentApi, parentKeys } from './api';
import { useAuth } from '@/features/auth/hooks';
import { ROLES } from '@/lib/constants';
import { ParentProfileUpdate } from './types';

export function useMyChildren() {
  const { role, isAuthenticated } = useAuth();
  const isParent = isAuthenticated && role === ROLES.PARENT;

  return useQuery({
    queryKey: parentKeys.children(),
    queryFn: parentApi.getMyChildren,
    enabled: isParent,
  });
}

export function useParentProfile() {
  const { role, isAuthenticated } = useAuth();
  const isParent = isAuthenticated && role === ROLES.PARENT;

  return useQuery({
    queryKey: parentKeys.profile(),
    queryFn: parentApi.getMyProfile,
    enabled: isParent,
  });
}

export function useUpdateParentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ParentProfileUpdate) => parentApi.updateMyProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.profile() });
    },
  });
}

export function useChildAttendance(studentId: string | null | undefined) {
  const { role, isAuthenticated } = useAuth();
  const isParent = isAuthenticated && role === ROLES.PARENT;

  return useQuery({
    queryKey: studentId ? parentKeys.attendance(studentId) : ['parent', 'attendance', 'null'],
    queryFn: () => (studentId ? parentApi.getChildAttendance(studentId) : null),
    enabled: isParent && Boolean(studentId),
  });
}

export function useChildMarks(studentId: string | null | undefined) {
  const { role, isAuthenticated } = useAuth();
  const isParent = isAuthenticated && role === ROLES.PARENT;

  return useQuery({
    queryKey: studentId ? parentKeys.marks(studentId) : ['parent', 'marks', 'null'],
    queryFn: () => (studentId ? parentApi.getChildMarks(studentId) : []),
    enabled: isParent && Boolean(studentId),
  });
}

export function useChildFees(studentId: string | null | undefined) {
  const { role, isAuthenticated } = useAuth();
  const isParent = isAuthenticated && role === ROLES.PARENT;

  return useQuery({
    queryKey: studentId ? parentKeys.fees(studentId) : ['parent', 'fees', 'null'],
    queryFn: () => (studentId ? parentApi.getChildFees(studentId) : []),
    enabled: isParent && Boolean(studentId),
  });
}

export function useChildTimetable(studentId: string | null | undefined) {
  const { role, isAuthenticated } = useAuth();
  const isParent = isAuthenticated && role === ROLES.PARENT;

  return useQuery({
    queryKey: studentId ? parentKeys.timetable(studentId) : ['parent', 'timetable', 'null'],
    queryFn: () => (studentId ? parentApi.getChildTimetable(studentId) : null),
    enabled: isParent && Boolean(studentId),
  });
}

export function useChildAssignments(studentId: string | null | undefined) {
  const { role, isAuthenticated } = useAuth();
  const isParent = isAuthenticated && role === ROLES.PARENT;

  return useQuery({
    queryKey: studentId ? parentKeys.assignments(studentId) : ['parent', 'assignments', 'null'],
    queryFn: () => (studentId ? parentApi.getChildAssignments(studentId) : null),
    enabled: isParent && Boolean(studentId),
  });
}

export function useParentNotifications() {
  const { role, isAuthenticated } = useAuth();
  const isParent = isAuthenticated && role === ROLES.PARENT;

  return useQuery({
    queryKey: parentKeys.notifications(),
    queryFn: parentApi.getNotifications,
    enabled: isParent,
  });
}
