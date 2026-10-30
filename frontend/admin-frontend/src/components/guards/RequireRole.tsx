'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks';
import { UserRole } from '@/lib/constants';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';

interface RequireRoleProps {
  roles?: UserRole[];
  children: React.ReactNode;
}

export default function RequireRole({ roles, children }: RequireRoleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isBootstrapped } = useAuth();

  React.useEffect(() => {
    if (!isBootstrapped) return;

    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (user?.must_change_password && pathname !== '/change-password') {
      router.replace('/change-password');
    }
  }, [isAuthenticated, isBootstrapped, pathname, router, user]);

  if (!isBootstrapped) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.must_change_password && pathname !== '/change-password') {
    return null;
  }

  if (roles && roles.length > 0 && user && !roles.includes(user.role)) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Paper
          sx={{
            p: 4,
            maxWidth: 480,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography variant="h5" color="error.main" fontWeight={700}>
            Access Restricted
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You do not have the required administrative permissions to view this section.
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Button variant="contained" onClick={() => router.push('/')}>
              Return to Dashboard
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return <>{children}</>;
}

