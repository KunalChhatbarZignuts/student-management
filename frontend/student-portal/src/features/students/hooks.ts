import { useQuery } from '@tanstack/react-query';
import { studentApi, studentKeys } from './api';
import { useAuth } from '@/features/auth/hooks';
import { ROLES } from '@/lib/constants';

export function useMyStudentProfile() {
  const { role, isAuthenticated } = useAuth();
  const isStudent = isAuthenticated && role === ROLES.STUDENT;

  return useQuery({
    queryKey: studentKeys.me(),
    queryFn: studentApi.getMyProfile,
    enabled: isStudent,
  });
}
