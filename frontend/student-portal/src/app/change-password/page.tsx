'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { changePasswordSchema, ChangePasswordFormData } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/features/auth/hooks';
import PasswordRuleChecklist from '@/components/ui/PasswordRuleChecklist';
import { formatErrorMessage } from '@/lib/errorMapper';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { AuthCardWrapper, PasswordInputField } from '@/features/auth/components';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const isForcedChange = !!user?.must_change_password;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPasswordValue = watch('newPassword');

  const onSubmit = async (data: ChangePasswordFormData) => {
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
    <AuthCardWrapper
      title={isForcedChange ? 'Mandatory Password Change' : 'Change Your Password'}
      subtitle={
        isForcedChange
          ? 'For security purposes, you must choose a new password before accessing your account.'
          : 'Update your account password with a secure new combination.'
      }
      maxWidth={460}
    >
      {isForcedChange && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You must change your initial temporary password before continuing.
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <PasswordInputField
          margin="normal"
          fullWidth
          id="oldPassword"
          label="Current Password"
          autoComplete="current-password"
          disabled={isSubmitting}
          error={!!errors.oldPassword}
          helperText={errors.oldPassword?.message}
          {...register('oldPassword')}
        />

        <PasswordInputField
          margin="normal"
          fullWidth
          id="newPassword"
          label="New Password"
          autoComplete="new-password"
          disabled={isSubmitting}
          error={!!errors.newPassword}
          helperText={errors.newPassword?.message}
          {...register('newPassword')}
        />

        <Box sx={{ mt: 1, mb: 2 }}>
          <PasswordRuleChecklist password={newPasswordValue || ''} />
        </Box>

        <PasswordInputField
          margin="normal"
          fullWidth
          id="confirmNewPassword"
          label="Confirm New Password"
          autoComplete="new-password"
          disabled={isSubmitting}
          error={!!errors.confirmNewPassword}
          helperText={errors.confirmNewPassword?.message}
          {...register('confirmNewPassword')}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isSubmitting}
          sx={{ mt: 3, mb: 1 }}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </Button>
      </Box>
    </AuthCardWrapper>
  );
}
