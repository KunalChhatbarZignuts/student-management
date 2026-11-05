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
import CircularProgress from '@mui/material/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { ParentWithChildren } from '@/features/parents/api';

export const editParentSchema = z.object({
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type EditParentFormData = z.infer<typeof editParentSchema>;

export interface EditParentDialogProps {
  editingParent: ParentWithChildren | null;
  onClose: () => void;
  onSubmit: (payload: EditParentFormData) => void;
  isSubmitting: boolean;
}

export default function EditParentDialog({
  editingParent,
  onClose,
  onSubmit,
  isSubmitting,
}: EditParentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditParentFormData>({
    resolver: zodResolver(editParentSchema),
  });

  React.useEffect(() => {
    if (editingParent) {
      reset({
        first_name: editingParent.first_name,
        last_name: editingParent.last_name,
        phone: editingParent.phone || '',
        address: editingParent.address || '',
      });
    }
  }, [editingParent, reset]);

  if (!editingParent) return null;

  return (
    <Dialog open={Boolean(editingParent)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Edit Parent / Guardian Profile</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                {...register('phone')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Home Address"
                {...register('address')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

