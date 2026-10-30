'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { forgotPasswordSchema, ForgotPasswordFormData } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';

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
      // ALWAYS show the exact same success message
      setSubmitted(true);
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
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 440, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
          Reset Password
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
          Enter your registered email address to receive password reset instructions.
        </Typography>

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
      </Paper>
    </Box>
  );
}
