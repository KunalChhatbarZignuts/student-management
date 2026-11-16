'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { resetPasswordSchema, ResetPasswordFormData } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import PasswordRuleChecklist from '@/components/ui/PasswordRuleChecklist';
import { formatErrorMessage } from '@/lib/errorMapper';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { AuthCardWrapper, TokenInvalidCard, PasswordInputField } from '@/features/auth/components';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const { showSnackbar } = useSnackbar();

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordValue = watch('password');

  if (!token) {
    return (
      <TokenInvalidCard
        message="Missing password reset token. Please request a new password reset link."
        actionHref="/forgot-password"
        actionLabel="Request Password Reset"
      />
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setErrorMessage(null);
    try {
      await authApi.resetPassword({
        token,
        new_password: data.password,
      });
      showSnackbar('Password has been reset successfully. You may now sign in.', 'success');
      router.push('/login');
    } catch (err: unknown) {
      const msg = formatErrorMessage(
        err,
        'Invalid or expired reset token. Please request a new password reset link.'
      );
      setErrorMessage(msg);
    }
  };

  return (
    <AuthCardWrapper
      title="Choose a New Password"
      subtitle="Your new password must meet all security guidelines below."
      maxWidth={460}
    >
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <PasswordInputField
          margin="normal"
          fullWidth
          id="password"
          label="New Password"
          autoComplete="new-password"
          disabled={isSubmitting}
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register('password')}
        />

        <Box sx={{ mt: 1, mb: 2 }}>
          <PasswordRuleChecklist password={passwordValue || ''} />
        </Box>

        <PasswordInputField
          margin="normal"
          fullWidth
          id="confirmPassword"
          label="Confirm New Password"
          autoComplete="new-password"
          disabled={isSubmitting}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          {...register('confirmPassword')}
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
          {isSubmitting ? 'Resetting Password...' : 'Set New Password'}
        </Button>
      </Box>
    </AuthCardWrapper>
  );
}
