'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';

import { ChangePasswordFormData } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/features/auth/hooks';
import { formatErrorMessage } from '@/lib/errorMapper';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { ChangePasswordCard } from '@/features/auth/components';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const isForcedChange = !!user?.must_change_password;

  const handleSubmit = async (data: ChangePasswordFormData) => {
    setErrorMessage(null);
    try {
      await authApi.changePassword({
        old_password: data.oldPassword,
        new_password: data.newPassword,
      });

      showSnackbar('Password updated successfully!', 'success');

      const updatedUser = await authApi.getMe();
      if (user) {
        user.must_change_password = updatedUser.must_change_password;
      }

      router.push('/');
    } catch (err: unknown) {
      const msg = formatErrorMessage(err, 'Failed to update password. Please check your inputs.');
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
      <ChangePasswordCard
        isForcedChange={isForcedChange}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </Box>
  );
}
