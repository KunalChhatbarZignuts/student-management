'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { TeacherCreatePayload } from '@/features/teachers/types';

export const createTeacherSchema = z.object({
  email: z.string().email('Valid email is required').trim().toLowerCase(),
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  department: z.string().min(1, 'Department is required').trim(),
  phone: z.string().optional(),
});

export type CreateTeacherFormData = z.infer<typeof createTeacherSchema>;

export interface CreateTeacherDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: TeacherCreatePayload) => void;
  isSubmitting: boolean;
}

export default function CreateTeacherDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateTeacherDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTeacherFormData>({
    resolver: zodResolver(createTeacherSchema),
    defaultValues: {
      department: 'Science',
    },
  });

  const handleFormSubmit = (data: CreateTeacherFormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Add Faculty Member</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Employee code is generated strictly by the system sequentially upon creation (e.g., EMP-XXXXXX).
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                error={!!errors.first_name}
                helperText={errors.first_name?.message}
                {...register('first_name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                error={!!errors.last_name}
                helperText={errors.last_name?.message}
                {...register('last_name')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                error={!!errors.department}
                helperText={errors.department?.message}
                {...register('department')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Phone (Optional)"
                {...register('phone')}
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
            {isSubmitting ? 'Creating...' : 'Create Teacher'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

