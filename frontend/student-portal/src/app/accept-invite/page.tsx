'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { acceptInviteSchema, AcceptInviteFormData } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import PasswordRuleChecklist from '@/components/ui/PasswordRuleChecklist';
import { formatErrorMessage } from '@/lib/errorMapper';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { AuthCardWrapper, TokenInvalidCard, PasswordInputField } from '@/features/auth/components';

export default function AcceptInvitePage() {
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
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
  });

  const passwordValue = watch('password');

  if (!token) {
    return (
      <TokenInvalidCard
        message="Missing invitation token. Please use the link sent to your email or contact your administrator."
        actionHref="/login"
        actionLabel="Go to Login"
      />
    );
  }

  const onSubmit = async (data: AcceptInviteFormData) => {
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
    <AuthCardWrapper
      title="Set Up Your Account"
      subtitle="Create a secure password to complete your account activation."
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
          label="Password"
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
          label="Confirm Password"
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
          {isSubmitting ? 'Activating...' : 'Activate Account'}
        </Button>
      </Box>
    </AuthCardWrapper>
  );
}
