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
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Section } from '@/features/grades/types';

export const sectionFormSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(50),
  code: z.string().max(20).optional().or(z.literal('')),
  class_capacity: z.coerce.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity cannot exceed 100'),
  assigned_teacher_id: z.string().optional().or(z.literal('')),
});

export type SectionFormData = z.infer<typeof sectionFormSchema>;

export interface SectionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SectionFormData) => void;
  isSubmitting: boolean;
  editingSection?: Section | null;
  teachers?: any[];
}

export default function SectionFormDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  editingSection,
  teachers = [],
}: SectionFormDialogProps) {
  const isEdit = Boolean(editingSection);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SectionFormData>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: {
      name: '',
      code: '',
      class_capacity: 30,
      assigned_teacher_id: '',
    },
  });

  React.useEffect(() => {
    if (editingSection) {
      reset({
        name: editingSection.name,
        code: editingSection.code || '',
        class_capacity: editingSection.class_capacity || 30,
        assigned_teacher_id: editingSection.assigned_teacher_id || '',
      });
    } else {
      reset({
        name: '',
        code: '',
        class_capacity: 30,
        assigned_teacher_id: '',
      });
    }
  }, [editingSection, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle fontWeight={700}>
          {isEdit ? 'Edit Section Details' : 'Add New Section'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Section Name *"
                placeholder="e.g. A, B, Blue, Red"
                error={!!errors.name}
                helperText={errors.name?.message}
                {...register('name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Section Code (Optional)"
                placeholder="e.g. SEC-A"
                error={!!errors.code}
                helperText={errors.code?.message}
                {...register('code')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Class Capacity *"
                error={!!errors.class_capacity}
                helperText={errors.class_capacity?.message}
                {...register('class_capacity')}
              />
            </Grid>
            {!isEdit && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Class Teacher (Optional)"
                  defaultValue=""
                  {...register('assigned_teacher_id')}
                >
                  <MenuItem value="">
                    <em>None (Assign Later)</em>
                  </MenuItem>
                  {teachers.map((t) => {
                    const teacherProfile = t.teacher;
                    const name = teacherProfile
                      ? `${teacherProfile.first_name} ${teacherProfile.last_name}`
                      : t.email;
                    return (
                      <MenuItem key={t.id} value={teacherProfile?.id || t.id}>
                        {name} {teacherProfile?.department ? `(${teacherProfile.department})` : ''}
                      </MenuItem>
                    );
                  })}
                </TextField>
              </Grid>
            )}
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
            {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Section')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

