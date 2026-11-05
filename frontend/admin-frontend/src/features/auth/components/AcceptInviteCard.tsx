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
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import { acceptInviteSchema, AcceptInviteFormData } from '@/features/auth/schemas';
import PasswordRuleChecklist from '@/components/ui/PasswordRuleChecklist';

export interface AcceptInviteCardProps {
  errorMessage: string | null;
  onSubmit: (data: AcceptInviteFormData) => Promise<void>;
}

export const AcceptInviteCard: React.FC<AcceptInviteCardProps> = ({
  errorMessage,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
  });

  const passwordValue = watch('password');

  return (
    <Paper sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 460, borderRadius: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
        Set Up Your Account
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
        Create a secure password to complete your staff registration.
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
          label="Create New Password"
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
          {isSubmitting ? 'Activating...' : 'Activate Account'}
        </Button>

        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account? Sign In
            </Typography>
          </Link>
        </Box>
      </Box>
    </Paper>
  );
};

