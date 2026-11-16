'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { AcademicYear, Grade } from '@/features/grades/types';
import { PaginatedUsersResponse } from '@/features/students/types';

export const gradeFormSchema = z.object({
  name: z.string().min(1, 'Grade name is required').max(50),
  code: z.string().max(20).optional().or(z.literal('')),
  description: z.string().max(255).optional().or(z.literal('')),
  level: z.coerce.number().min(0, 'Level must be >= 0').max(20, 'Level must be <= 20'),
  academic_year_id: z.string().min(1, 'Academic Year is required'),
  coordinator_teacher_id: z.string().optional().or(z.literal('')),
});

export type GradeFormData = z.infer<typeof gradeFormSchema>;

export interface GradeFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialGrade?: Grade | null;
  defaultAcademicYearId?: string;
  academicYears: AcademicYear[];
  teachers: PaginatedUsersResponse['items'];
  onSubmit: (data: GradeFormData) => void;
  isSubmitting: boolean;
}

export default function GradeFormDialog({
  open,
  onClose,
  mode,
  initialGrade,
  defaultAcademicYearId,
  academicYears,
  teachers,
  onSubmit,
  isSubmitting,
}: GradeFormDialogProps) {
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      level: 1,
      academic_year_id: defaultAcademicYearId || '',
      coordinator_teacher_id: '',
    },
  });

  // Sync initial values whenever open or initialGrade changes
  React.useEffect(() => {
    if (open) {
      if (isEdit && initialGrade) {
        reset({
          name: initialGrade.name,
          code: initialGrade.code || '',
          description: initialGrade.description || '',
          level: initialGrade.level,
          academic_year_id: initialGrade.academic_year_id,
          coordinator_teacher_id: initialGrade.coordinator_teacher_id || '',
        });
      } else {
        reset({
          name: '',
          code: '',
          description: '',
          level: 1,
          academic_year_id: defaultAcademicYearId || (academicYears[0]?.id ?? ''),
          coordinator_teacher_id: '',
        });
      }
    }
  }, [open, isEdit, initialGrade, defaultAcademicYearId, academicYears, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? `Edit Grade: ${initialGrade?.name}` : 'Add Academic Grade'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Grade Name */}
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Grade Name *"
                placeholder="e.g. Grade 10"
                {...register('name')}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
              />
            </Grid>

            {/* Grade Code */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Grade Code"
                placeholder="e.g. G10"
                {...register('code')}
                error={Boolean(errors.code)}
                helperText={errors.code?.message}
              />
            </Grid>

            {/* Level */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Level (0-20) *"
                {...register('level')}
                error={Boolean(errors.level)}
                helperText={errors.level?.message}
              />
            </Grid>

            {/* Academic Year */}
            <Grid item xs={12} sm={6}>
              {isEdit ? (
                <TextField
                  fullWidth
                  disabled
                  label="Academic Year"
                  value={initialGrade?.academic_year_name || ''}
                />
              ) : (
                <TextField
                  fullWidth
                  select
                  label="Academic Year *"
                  defaultValue={defaultAcademicYearId || ''}
                  {...register('academic_year_id')}
                  error={Boolean(errors.academic_year_id)}
                  helperText={errors.academic_year_id?.message}
                >
                  {academicYears.map((year) => (
                    <MenuItem key={year.id} value={year.id}>
                      {year.name} {year.is_current ? '(Current)' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Grid>

            {/* Grade Coordinator */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Grade Coordinator (Optional)"
                defaultValue={initialGrade?.coordinator_teacher_id || ''}
                {...register('coordinator_teacher_id')}
                helperText="Optional senior teacher responsible for coordinating this grade level."
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {teachers.map((item) => {
                  const name = item.teacher
                    ? `${item.teacher.first_name} ${item.teacher.last_name}`
                    : item.email;
                  const teacherId = item.teacher?.id || item.id;
                  return (
                    <MenuItem key={item.id} value={teacherId}>
                      {name} ({item.email})
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                placeholder="Brief notes about curriculum or age bracket..."
                {...register('description')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? (
              <CircularProgress size={24} />
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Create Grade'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
