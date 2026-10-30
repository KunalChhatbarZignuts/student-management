'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import ReportProblemIcon from '@mui/icons-material/ReportProblem';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { teacherPortalApi } from '@/features/teacher-portal/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

const reportMissingSchema = z.object({
  student_name: z.string().min(2, 'Student Name is required (at least 2 characters)').max(100).trim(),
  class_name: z.string().min(1, 'Class Name is required').max(20).trim(),
  section: z.string().min(1, 'Section is required').max(10).trim(),
  notes: z.string().optional(),
});

type ReportMissingFormData = z.infer<typeof reportMissingSchema>;

export default function ReportMissingPage() {
  const { showSnackbar } = useSnackbar();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportMissingFormData>({
    resolver: zodResolver(reportMissingSchema),
    defaultValues: {
      class_name: 'Grade 10',
      section: 'A',
      notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ReportMissingFormData) => teacherPortalApi.reportMissingStudent(data),
    onSuccess: () => {
      showSnackbar('Missing student notification filed with administration office!', 'success');
      reset();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to file report'), 'error');
    },
  });

  return (
    <RequireRole roles={[ROLES.TEACHER]}>
      <AppShell>
        <Box sx={{ maxWidth: 680, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Report Missing Student
            </Typography>
            <Typography variant="body2" color="text.secondary">
              File an official notice if an enrolled student has an unexcused or prolonged absence from classroom roll call.
            </Typography>
          </Box>

          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <ReportProblemIcon color="warning" sx={{ fontSize: 32 }} />
              <Typography variant="h6" fontWeight={700}>
                Attendance Discrepancy Notice
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit((d) => mutation.mutate(d))} noValidate>
              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Student Name"
                    placeholder="e.g. Ada Lovelace"
                    error={!!errors.student_name}
                    helperText={errors.student_name?.message}
                    {...register('student_name')}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Class Name"
                    error={!!errors.class_name}
                    helperText={errors.class_name?.message}
                    {...register('class_name')}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Section"
                    error={!!errors.section}
                    helperText={errors.section?.message}
                    {...register('section')}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Remarks & Observations (Optional)"
                    placeholder="Any relevant observations or contact attempts..."
                    {...register('notes')}
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                sx={{ mt: 3 }}
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {isSubmitting ? 'Filing Report...' : 'Submit Missing Student Notice'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </AppShell>
    </RequireRole>
  );
}

