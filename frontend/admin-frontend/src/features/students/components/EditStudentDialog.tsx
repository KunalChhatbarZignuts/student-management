'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AppDatePicker from '@/components/ui/AppDatePicker';
import { AcademicYear } from '@/features/grades/types';

export const editStudentSchema = z.object({
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  dob: z.string().min(1, 'Date of birth is required'),
  department: z.string().min(1, 'Department is required').trim(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().email('Invalid guardian email').optional().or(z.literal('')),
  transfer_reason: z.string().optional(),
});

export type EditStudentFormData = z.infer<typeof editStudentSchema>;

export interface EditStudentDialogProps {
  editingStudent: any | null;
  onClose: () => void;
  onSubmit: (data: {
    formData: EditStudentFormData;
    editYearId: string;
    editGradeId: string;
    editSectionId: string;
  }) => void;
  isSubmitting: boolean;
  academicYears: AcademicYear[];
  editYearId: string;
  onEditYearChange: (yearId: string) => void;
  editGradeId: string;
  onEditGradeChange: (gradeId: string) => void;
  editSectionId: string;
  onEditSectionChange: (sectionId: string) => void;
  editGradesList: any;
  loadingEditGrades: boolean;
  editSectionsList: any[];
  loadingEditSections: boolean;
}

export default function EditStudentDialog({
  editingStudent,
  onClose,
  onSubmit,
  isSubmitting,
  academicYears,
  editYearId,
  onEditYearChange,
  editGradeId,
  onEditGradeChange,
  editSectionId,
  onEditSectionChange,
  editGradesList,
  loadingEditGrades,
  editSectionsList,
  loadingEditSections,
}: EditStudentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
  });

  React.useEffect(() => {
    if (editingStudent) {
      reset({
        first_name: editingStudent.first_name,
        last_name: editingStudent.last_name,
        dob: editingStudent.dob,
        department: editingStudent.department || 'General',
        guardian_name: editingStudent.guardian_name || '',
        guardian_phone: editingStudent.guardian_phone || '',
        guardian_email: editingStudent.guardian_email || '',
        transfer_reason: '',
      });
    }
  }, [editingStudent, reset]);

  if (!editingStudent) return null;

  const handleFormSubmit = (formData: EditStudentFormData) => {
    onSubmit({
      formData,
      editYearId,
      editGradeId,
      editSectionId,
    });
  };

  return (
    <Dialog open={Boolean(editingStudent)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={700}>
        Edit Student & Academic Enrollment
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
        <DialogContent dividers>
          {/* Current Active Enrollment Read-only Header */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Current Active Enrollment
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Enrollment No.</Typography>
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {editingStudent.enrollment_number || editingStudent.student_code || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Academic Year</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {editingStudent.current_academic_year || 'Not Assigned'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Grade & Section</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {editingStudent.current_grade ? `${editingStudent.current_grade} - Sec ${editingStudent.current_section}` : 'Not Enrolled'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Class Teacher</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {editingStudent.class_teacher_name || 'None Assigned'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            Personal Information
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
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
              <TextField
                fullWidth
                label="Department"
                error={!!errors.department}
                helperText={errors.department?.message}
                {...register('department')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Guardian Name"
                {...register('guardian_name')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Guardian Phone"
                {...register('guardian_phone')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Guardian Email"
                error={!!errors.guardian_email}
                helperText={errors.guardian_email?.message}
                {...register('guardian_email')}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Section Transfer / Reassignment */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
            Transfer Section / Grade (Optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            To transfer or reassign the student, select a new Academic Year, Grade, and Section below. Previous enrollment history will be preserved.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="New Academic Year"
                value={editYearId}
                onChange={(e) => {
                  onEditYearChange(e.target.value);
                }}
                helperText="Leave unselected if keeping current section"
              >
                <MenuItem value="">
                  <em>None (No transfer)</em>
                </MenuItem>
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
                label="New Grade / Class"
                value={editGradeId}
                disabled={!editYearId || loadingEditGrades || !editGradesList?.items?.length}
                onChange={(e) => {
                  onEditGradeChange(e.target.value);
                }}
                helperText={
                  !editYearId
                    ? 'Select Year first'
                    : loadingEditGrades
                    ? 'Loading grades...'
                    : !editGradesList?.items?.length
                    ? 'No active grades'
                    : undefined
                }
              >
                <MenuItem value="" disabled>
                  Select grade...
                </MenuItem>
                {editGradesList?.items?.map((g: any) => (
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
                label="New Section"
                value={editSectionId}
                disabled={!editGradeId || loadingEditSections || !editSectionsList?.length}
                onChange={(e) => onEditSectionChange(e.target.value)}
                helperText={
                  !editGradeId
                    ? 'Select Grade first'
                    : loadingEditSections
                    ? 'Loading sections...'
                    : !editSectionsList?.length
                    ? 'No active sections'
                    : undefined
                }
              >
                <MenuItem value="" disabled>
                  Select section...
                </MenuItem>
                {editSectionsList?.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    Section {s.name} ({s.total_students}/{s.class_capacity || 30})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {editSectionId && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Transfer Reason"
                  placeholder="e.g. Promoted to higher grade, Parent requested class change, Stream shift"
                  error={!!errors.transfer_reason}
                  helperText={errors.transfer_reason?.message}
                  {...register('transfer_reason')}
                />
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

