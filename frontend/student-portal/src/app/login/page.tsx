'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SchoolIcon from '@mui/icons-material/School';

import { useAuth } from '@/features/auth/hooks';
import { loginSchema, LoginFormData } from '@/features/auth/schemas';
import { formatErrorMessage } from '@/lib/errorMapper';
import { AuthCardWrapper, PasswordInputField } from '@/features/auth/components';

export default function LoginPage() {
  const router = useRouter();
  const { login, sessionError, isAuthenticated } = useAuth();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      await login(data);
    } catch (err: unknown) {
      const msg = formatErrorMessage(err, 'Invalid credentials');
      setErrorMessage(msg);
    }
  };

  return (
    <AuthCardWrapper
      title="Student & Parent Portal"
      subtitle="Sign in to check attendance, marks, fees, and leave applications"
      icon={<SchoolIcon sx={{ fontSize: 36, color: '#ffffff' }} />}
      maxWidth={440}
    >
      {sessionError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {sessionError}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          margin="normal"
          fullWidth
          id="identifier"
          label="Email, Student ID, or Employee ID"
          autoComplete="username"
          autoFocus
          disabled={isSubmitting}
          error={!!errors.identifier}
          helperText={errors.identifier?.message}
          {...register('identifier')}
        />

        <PasswordInputField
          margin="normal"
          fullWidth
          id="password"
          label="Password"
          autoComplete="current-password"
          disabled={isSubmitting}
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register('password')}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
            <Typography variant="body2" color="primary.main">
              Forgot password?
            </Typography>
          </Link>
        </Box>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isSubmitting}
          sx={{ mt: 3, mb: 2 }}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </Box>
    </AuthCardWrapper>
  );
}
