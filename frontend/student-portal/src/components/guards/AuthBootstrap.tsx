'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/features/auth/api';
import { STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { isBootstrapped, setBootstrapped, setAuth, clearAuth } = useAuthStore();
  const [initError, setInitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      try {
        const tokenRes = await authApi.refresh();
        useAuthStore.getState().setAccessToken(tokenRes.access_token);

        const me = await authApi.getMe();

        if (!STUDENT_PORTAL_ALLOWED_ROLES.includes(me.role)) {
          await authApi.logout().catch(() => {});
          clearAuth("You don't have access to this portal");
          if (isMounted) {
            setInitError("You don't have access to this portal");
            setBootstrapped(true);
          }
          return;
        }

        if (isMounted) {
          setAuth(tokenRes.access_token, me);
          setBootstrapped(true);
        }
      } catch {
        // No active session or refresh expired
        if (isMounted) {
          clearAuth();
          setBootstrapped(true);
        }
      }
    }

    if (!isBootstrapped) {
      initializeSession();
    }

    return () => {
      isMounted = false;
    };
  }, [clearAuth, isBootstrapped, setAuth, setBootstrapped]);

  if (!isBootstrapped) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={52} thickness={4} color="primary" />
        <Typography variant="body1" color="text.secondary" fontWeight={500}>
          Loading your session...
        </Typography>
      </Box>
    );
  }

  if (initError) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: 'background.default',
          p: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" color="error" fontWeight={700}>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {initError}
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setInitError(null);
            window.location.href = '/login';
          }}
          sx={{ mt: 2 }}
        >
          Return to Sign In
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
