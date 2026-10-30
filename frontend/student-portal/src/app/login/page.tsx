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
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SchoolIcon from '@mui/icons-material/School';

import { useAuth } from '@/features/auth/hooks';
import { loginSchema, LoginFormData, twoFactorSchema, TwoFactorFormData } from '@/features/auth/schemas';
import { formatErrorMessage } from '@/lib/errorMapper';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login, verify2FA, requires2FA, sessionError, isAuthenticated } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [showPassword, setShowPassword] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  // Main login form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // 2FA OTP form
  const {
    register: register2FA,
    handleSubmit: handleSubmit2FA,
    reset: reset2FA,
    formState: { errors: errors2FA, isSubmitting: isSubmitting2FA },
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: '',
    },
  });

  React.useEffect(() => {
    if (requires2FA) {
      reset2FA({ code: '' });
    }
  }, [requires2FA, reset2FA]);

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      await login(data);
    } catch (err: unknown) {
      const msg = formatErrorMessage(err, 'Invalid credentials');
      setErrorMessage(msg);
    }
  };

  const onSubmit2FA = async (data: TwoFactorFormData) => {
    setErrorMessage(null);
    try {
      await verify2FA(data.code);
      showSnackbar('Two-factor authentication verified', 'success');
    } catch (err: unknown) {
      const msg = formatErrorMessage(err, 'Invalid verification code');
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
        bgcolor: 'background.default',
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 5 },
          width: '100%',
          maxWidth: 440,
          borderRadius: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 1.5,
              borderRadius: 3,
              bgcolor: 'primary.light',
              color: 'primary.dark',
              mb: 1.5,
            }}
          >
            <SchoolIcon sx={{ fontSize: 36, color: '#ffffff' }} />
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Student & Parent Portal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {requires2FA
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Sign in to access student records and learning portal'}
          </Typography>
        </Box>

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

        {!requires2FA ? (
          <Box key="login-form" component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
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

            <TextField
              margin="normal"
              fullWidth
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isSubmitting}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              {...register('password')}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary.main" fontWeight={500}>
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
        ) : (
          <Box key="2fa-form" component="form" onSubmit={handleSubmit2FA(onSubmit2FA)} noValidate>
            <TextField
              margin="normal"
              fullWidth
              id="code"
              label="6-Digit OTP Code"
              placeholder="123456"
              autoFocus
              inputProps={{ maxLength: 6, inputMode: 'numeric' }}
              disabled={isSubmitting2FA}
              error={!!errors2FA.code}
              helperText={errors2FA.code?.message}
              {...register2FA('code')}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting2FA}
              sx={{ mt: 3, mb: 2 }}
              startIcon={isSubmitting2FA ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSubmitting2FA ? 'Verifying...' : 'Verify & Continue'}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
