'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';

import { AcceptInviteFormData } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import { formatErrorMessage } from '@/lib/errorMapper';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { AcceptInviteCard } from '@/features/auth/components';

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const { showSnackbar } = useSnackbar();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!token) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 440, textAlign: 'center' }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Missing invitation token. Please use the link sent to your email or contact your administrator.
          </Alert>
          <Button component={Link} href="/login" variant="contained">
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  const handleSubmit = async (data: AcceptInviteFormData) => {
    setErrorMessage(null);
    try {
      await authApi.acceptInvite({
        token,
        new_password: data.password,
      });
      showSnackbar('Account activated successfully! You may now sign in.', 'success');
      router.push('/login');
    } catch (err: unknown) {
      const msg = formatErrorMessage(
        err,
        'This invitation link is invalid or has expired. Please contact your administrator.'
      );
      setErrorMessage(msg);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <AcceptInviteCard errorMessage={errorMessage} onSubmit={handleSubmit} />
    </Box>
  );
}
