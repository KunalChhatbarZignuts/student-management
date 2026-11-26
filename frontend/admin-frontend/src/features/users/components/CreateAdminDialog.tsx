'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const ADMIN_MODULES = [
  { key: 'admissions', label: 'Admissions & Inquiries' },
  { key: 'students', label: 'Student Directory & Records' },
  { key: 'teachers', label: 'Teacher Management' },
  { key: 'academics', label: 'Academics & Timetables' },
  { key: 'attendance', label: 'Attendance & Leaves' },
  { key: 'fees', label: 'Fee Management & POS' },
  { key: 'examinations', label: 'Examinations & Marks' },
  { key: 'diary', label: 'School Diary' },
] as const;

export const createAdminSchema = z
  .object({
    email: z.string().email('Valid email is required').trim().toLowerCase(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    permissions: z.array(z.string()).default([]),
    password: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.length >= 10,
        'Password must be at least 10 characters long if provided'
      ),
    confirm_password: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password !== data.confirm_password) {
        return false;
      }
      return true;
    },
    {
      message: 'Passwords must match',
      path: ['confirm_password'],
    }
  );

export type CreateAdminFormData = z.infer<typeof createAdminSchema>;

export interface CreateAdminDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    email: string;
    first_name?: string;
    last_name?: string;
    permissions?: string[];
    password?: string;
  }) => void;
  isSubmitting: boolean;
}

export default function CreateAdminDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateAdminDialogProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateAdminFormData>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      permissions: [],
      password: '',
      confirm_password: '',
    },
  });

  const handleFormSubmit = (data: CreateAdminFormData) => {
    onSubmit({
      email: data.email,
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      permissions: data.permissions,
      password: data.password ? data.password : undefined,
    });
  };

  const handleClose = () => {
    reset();
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Provision Scoped Administrator</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Configure an administrator account. You can optionally set their initial password directly, or leave it blank to send an email invitation token.
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Admin Email Address"
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name (Optional)"
                {...register('first_name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name (Optional)"
                {...register('last_name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Initial Password (Optional)"
                type={showPassword ? 'text' : 'password'}
                error={!!errors.password}
                helperText={errors.password?.message || 'Min 10 characters'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register('password')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                error={!!errors.confirm_password}
                helperText={errors.confirm_password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        size="small"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register('confirm_password')}
              />
            </Grid>
            <Grid item xs={12}>
              <FormLabel component="legend" sx={{ fontWeight: 600, fontSize: '0.875rem', mt: 1, mb: 0.5 }}>
                Granted Module Permissions (Least Privilege):
              </FormLabel>
              <Controller
                name="permissions"
                control={control}
                render={({ field }) => (
                  <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                    {ADMIN_MODULES.map((mod) => {
                      const isChecked = field.value?.includes(mod.key);
                      return (
                        <FormControlLabel
                          key={mod.key}
                          control={
                            <Checkbox
                              size="small"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...(field.value || []), mod.key]
                                  : (field.value || []).filter((k: string) => k !== mod.key);
                                field.onChange(next);
                              }}
                            />
                          }
                          label={<Typography variant="body2">{mod.label}</Typography>}
                        />
                      );
                    })}
                  </FormGroup>
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isSubmitting ? 'Creating...' : 'Provision Admin'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

