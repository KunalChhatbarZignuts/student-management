'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { ROLES } from '@/lib/constants';
import { examinationsApi } from '@/features/examinations/api';
import { MarksEntryTable } from '@/features/examinations/components';
import { StudentRosterMarkItem } from '@/features/examinations/types';

export default function MarksEntryPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const scheduleId = params.scheduleId as string;

  // 1. Fetch Schedule Roster
  const { data: roster, isLoading, error } = useQuery({
    queryKey: ['schedule-roster', scheduleId],
    queryFn: () => examinationsApi.getScheduleRoster(scheduleId),
    enabled: Boolean(scheduleId),
  });

  // 2. Save Draft Mutation
  const saveDraftMutation = useMutation({
    mutationFn: (data: { marks: StudentRosterMarkItem[]; teacherRemarks: string }) =>
      examinationsApi.saveDraftMarks(scheduleId, {
        marks: data.marks.map((m) => ({
          student_id: m.student_id,
          marks_obtained: m.marks_obtained,
          is_absent: m.is_absent,
          remarks: m.remarks,
        })),
        teacher_remarks: data.teacherRemarks,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-roster', scheduleId] });
      showSnackbar('Draft marks saved successfully!', 'success');
    },
    onError: (err: any) => {
      showSnackbar(err?.response?.data?.detail || 'Failed to save draft marks', 'error');
    },
  });

  // 3. Submit Marks Mutation
  const submitMutation = useMutation({
    mutationFn: (data: { marks: StudentRosterMarkItem[]; teacherRemarks: string }) =>
      examinationsApi.submitMarks(scheduleId, {
        marks: data.marks.map((m) => ({
          student_id: m.student_id,
          marks_obtained: m.marks_obtained,
          is_absent: m.is_absent,
          remarks: m.remarks,
        })),
        teacher_remarks: data.teacherRemarks,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-roster', scheduleId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-examinations'] });
      showSnackbar('Class examination marks submitted successfully to administration!', 'success');
      router.push('/my-examinations');
    },
    onError: (err: any) => {
      showSnackbar(err?.response?.data?.detail || 'Failed to submit marks', 'error');
    },
  });

  if (isLoading) {
    return (
      <RequireRole roles={[ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
        <AppShell>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </AppShell>
      </RequireRole>
    );
  }

  if (error || !roster) {
    return (
      <RequireRole roles={[ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
        <AppShell>
          <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Alert severity="error">
              {(error as any)?.response?.data?.detail ||
                'Access Denied: Only the assigned Class Teacher can enter marks for this section.'}
            </Alert>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/my-examinations')}
              sx={{ mt: 2 }}
            >
              Back to My Examinations
            </Button>
          </Box>
        </AppShell>
      </RequireRole>
    );
  }

  return (
    <RequireRole roles={[ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/my-examinations')}
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            Back to Examinations List
          </Button>

          {/* Schedule Info Banner */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {roster.subject_name} • Marks Entry Sheet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>{roster.exam_name}</strong> ({roster.term}) • Grade & Section:{' '}
                  <strong>{roster.grade_name} - {roster.section_name}</strong>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Chip
                  label={`Max Marks: ${roster.max_marks}`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label={`Pass Marks: ${roster.pass_marks}`}
                  color="warning"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label={`Exam Date: ${roster.exam_date}`}
                  sx={{ fontWeight: 500 }}
                />
              </Box>
            </Box>
          </Paper>

          {/* Roster & Marks Table */}
          <MarksEntryTable
            roster={roster}
            onSaveDraft={async (marks, remarks) => {
              await saveDraftMutation.mutateAsync({ marks, teacherRemarks: remarks });
            }}
            onSubmitMarks={async (marks, remarks) => {
              await submitMutation.mutateAsync({ marks, teacherRemarks: remarks });
            }}
            isSaving={saveDraftMutation.isPending}
            isSubmitting={submitMutation.isPending}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}

