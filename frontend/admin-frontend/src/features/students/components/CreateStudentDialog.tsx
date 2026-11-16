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
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AppDatePicker from '@/components/ui/AppDatePicker';
import { StudentCreatePayload } from '@/features/students/types';
import { AcademicYear } from '@/features/grades/types';

export const createStudentSchema = z.object({
  email: z.string().email('Valid email is required').trim().toLowerCase(),
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  dob: z.string().min(1, 'Date of birth is required'),
  department: z.string().min(1, 'Department is required').trim().default('General'),
  admission_date: z.string().min(1, 'Admission date is required'),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().email('Invalid guardian email').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

export type CreateStudentFormData = z.infer<typeof createStudentSchema>;

export interface CreateStudentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: StudentCreatePayload) => void;
  isSubmitting: boolean;
  academicYears: AcademicYear[];
  enrollYearId: string;
  onYearChange: (yearId: string) => void;
  gradesList: any;
  enrollGradeId: string;
  onGradeChange: (gradeId: string) => void;
  sectionsList: any[];
  enrollSectionId: string;
  onSectionChange: (sectionId: string) => void;
}

export default function CreateStudentDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  academicYears,
  enrollYearId,
  onYearChange,
  gradesList,
  enrollGradeId,
  onGradeChange,
  sectionsList,
  enrollSectionId,
  onSectionChange,
}: CreateStudentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      dob: '2008-01-01',
      admission_date: new Date().toISOString().split('T')[0],
      department: 'General',
    },
  });

  const handleFormSubmit = (formData: CreateStudentFormData) => {
    onSubmit({
      ...formData,
      academic_year_id: enrollYearId,
      grade_id: enrollGradeId,
      section_id: enrollSectionId,
      guardian_email: formData.guardian_email || undefined,
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Enroll New Student</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Student ID (code) is generated strictly by the server upon submission and cannot be manually modified.
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
                label="Student Email Address"
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email')}
              />
            </Grid>
            {/* Dependent Academic Hierarchy: Year -> Grade -> Section */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="Academic Year *"
                value={enrollYearId}
                onChange={(e) => onYearChange(e.target.value)}
              >
                {academicYears.map((year) => (
                  <MenuItem key={year.id} value={year.id}>
                    {year.name} {year.is_current ? '(Current)' : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="Grade / Class *"
                value={enrollGradeId}
                disabled={!enrollYearId || !gradesList?.items?.length}
                onChange={(e) => onGradeChange(e.target.value)}
                helperText={!gradesList?.items?.length && enrollYearId ? 'No active grades in this year' : undefined}
              >
                <MenuItem value="" disabled>
                  Select grade...
                </MenuItem>
                {gradesList?.items?.map((g: any) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name} {g.code ? `(${g.code})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="Section *"
                value={enrollSectionId}
                disabled={!enrollGradeId || !sectionsList?.length}
                onChange={(e) => onSectionChange(e.target.value)}
                helperText={!sectionsList?.length && enrollGradeId ? 'No sections in this grade' : undefined}
              >
                <MenuItem value="" disabled>
                  Select section...
                </MenuItem>
                {sectionsList?.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    Section {s.name} ({s.total_students}/{s.class_capacity || 30})
                  </MenuItem>
                ))}
              </TextField>
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
              <AppDatePicker
                label="Date of Birth"
                value={watch('dob')}
                onChange={(val) => setValue('dob', val, { shouldValidate: true })}
                error={!!errors.dob}
                helperText={errors.dob?.message}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppDatePicker
                label="Admission Date"
                value={watch('admission_date')}
                onChange={(val) => setValue('admission_date', val, { shouldValidate: true })}
                error={!!errors.admission_date}
                helperText={errors.admission_date?.message}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Guardian Name"
                {...register('guardian_name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Guardian Phone"
                {...register('guardian_phone')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Guardian Email"
                error={!!errors.guardian_email}
                helperText={errors.guardian_email?.message}
                {...register('guardian_email')}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label="Initial Password (Optional)"
                  placeholder="Leave blank to invite via email, or set password now"
                  error={!!errors.password}
                  helperText={errors.password?.message || 'Set initial password so student can log in directly to Student Portal'}
                  {...register('password')}
                />
                <Button
                  variant="outlined"
                  sx={{ height: 56, whiteSpace: 'nowrap' }}
                  onClick={() => {
                    const randomPwd = `Student@${Math.floor(1000 + Math.random() * 9000)}`;
                    setValue('password', randomPwd);
                  }}
                >
                  Generate
                </Button>
              </Box>
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
            {isSubmitting ? 'Creating...' : 'Enroll Student'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

