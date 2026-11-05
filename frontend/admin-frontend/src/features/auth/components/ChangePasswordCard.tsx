import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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

import { changePasswordSchema, ChangePasswordFormData } from '@/features/auth/schemas';
import PasswordRuleChecklist from '@/components/ui/PasswordRuleChecklist';

export interface ChangePasswordCardProps {
  isForcedChange: boolean;
  errorMessage: string | null;
  onSubmit: (data: ChangePasswordFormData) => Promise<void>;
  onCancel: () => void;
}

export const ChangePasswordCard: React.FC<ChangePasswordCardProps> = ({
  isForcedChange,
  errorMessage,
  onSubmit,
  onCancel,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPasswordValue = watch('newPassword');

  return (
    <Paper sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 460, borderRadius: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
        {isForcedChange ? 'Mandatory Password Change' : 'Change Your Password'}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
        {isForcedChange
          ? 'For security purposes, you must choose a new password before accessing administrative features.'
          : 'Update your administrator password with a secure new combination.'}
      </Typography>

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
        {!isForcedChange && (
          <TextField
            margin="normal"
            fullWidth
            id="oldPassword"
            label="Current Password"
            type="password"
            disabled={isSubmitting}
            error={!!errors.oldPassword}
            helperText={errors.oldPassword?.message}
            {...register('oldPassword')}
          />
        )}

        <TextField
          margin="normal"
          fullWidth
          id="newPassword"
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          disabled={isSubmitting}
          error={!!errors.newPassword}
          helperText={errors.newPassword?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          {...register('newPassword')}
        />

        <PasswordRuleChecklist password={newPasswordValue} />

        <TextField
          margin="normal"
          fullWidth
          id="confirmNewPassword"
          label="Confirm New Password"
          type={showPassword ? 'text' : 'password'}
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
          sx={{ mt: 3, mb: 2 }}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </Button>

        {!isForcedChange && (
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Button onClick={onCancel} color="inherit">
              Cancel
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

