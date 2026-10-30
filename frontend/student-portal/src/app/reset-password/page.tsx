'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import { resetPasswordSchema, ResetPasswordFormData } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import PasswordRuleChecklist from '@/components/ui/PasswordRuleChecklist';
import { formatErrorMessage } from '@/lib/errorMapper';
import { useSnackbar } from '@/components/ui/SnackbarProvider';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const { showSnackbar } = useSnackbar();

  const [showPassword, setShowPassword] = React.useState(false);
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
            Missing password reset token. Please request a new password reset link.
          </Alert>
          <Button component={Link} href="/forgot-password" variant="contained">
            Request Password Reset
          </Button>
        </Paper>
      </Box>
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 460, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
          Choose a New Password
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
          Please enter and confirm your new secure password.
        </Typography>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            margin="normal"
            fullWidth
            id="password"
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            disabled={isSubmitting}
            error={!!errors.password}
            helperText={errors.password?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            {...register('password')}
          />

          <PasswordRuleChecklist password={passwordValue} />

          <TextField
            margin="normal"
            fullWidth
            id="confirmPassword"
            label="Confirm New Password"
            type={showPassword ? 'text' : 'password'}
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
            sx={{ mt: 3, mb: 2 }}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isSubmitting ? 'Resetting Password...' : 'Save New Password'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <Typography variant="body2" color="text.secondary">
                Back to Sign In
              </Typography>
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
