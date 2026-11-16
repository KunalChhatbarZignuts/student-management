'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { forgotPasswordSchema, ForgotPasswordFormData } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import { AuthCardWrapper } from '@/features/auth/components';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await authApi.forgotPassword(data);
    } catch {
      // Intentionally ignore backend user-enumeration response differences
    } finally {
      setSubmitted(true);
    }
  };

  return (
    <AuthCardWrapper
      title="Reset Password"
      subtitle="Enter your registered email address to receive password reset instructions."
      maxWidth={440}
    >
      {submitted ? (
        <Box sx={{ textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            If an account exists with this email address, you will receive password reset instructions shortly.
          </Alert>
          <Button component={Link} href="/login" variant="contained" fullWidth>
            Return to Sign In
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            margin="normal"
            fullWidth
            id="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            autoFocus
            disabled={isSubmitting}
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isSubmitting}
            sx={{ mt: 3, mb: 2 }}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isSubmitting ? 'Sending Request...' : 'Send Reset Link'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <Typography variant="body2" color="primary.main">
                Back to Sign In
              </Typography>
            </Link>
          </Box>
        </Box>
      )}
    </AuthCardWrapper>
  );
}
