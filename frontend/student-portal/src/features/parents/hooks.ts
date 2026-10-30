import { useQuery } from '@tanstack/react-query';
import { parentApi, parentKeys } from './api';
import { useAuth } from '@/features/auth/hooks';
import { ROLES } from '@/lib/constants';

export function useMyChildren() {
  const { role, isAuthenticated } = useAuth();
  const isParent = isAuthenticated && role === ROLES.PARENT;

  return useQuery({
    queryKey: parentKeys.children(),
    queryFn: parentApi.getMyChildren,
    enabled: isParent,
  });
}
