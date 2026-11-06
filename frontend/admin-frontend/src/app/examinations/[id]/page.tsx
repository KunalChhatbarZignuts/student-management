'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PublishIcon from '@mui/icons-material/Publish';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { ROLES } from '@/lib/constants';
import { examinationsApi } from '@/features/examinations/api';
import {
  ExaminationScheduleTable,
  PublishResultsDialog,
  ScheduleSubjectDialog,
} from '@/features/examinations/components';
import { CreateSchedulePayload } from '@/features/examinations/types';

export default function ExaminationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const examinationId = params.id as string;
  const [tabIndex, setTabIndex] = React.useState(0);
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);

  // 1. Fetch Examination Details
  const { data: examination, isLoading: isExamLoading } = useQuery({
    queryKey: ['examination', examinationId],
    queryFn: () => examinationsApi.getExamination(examinationId),
    enabled: Boolean(examinationId),
  });

  // 2. Fetch Schedules
  const { data: schedules, isLoading: isSchedulesLoading } = useQuery({
    queryKey: ['examination-schedules', examinationId],
    queryFn: () => examinationsApi.listSchedules(examinationId),
    enabled: Boolean(examinationId),
  });

  // 3. Add Schedule Mutation
  const addScheduleMutation = useMutation({
    mutationFn: (payload: CreateSchedulePayload) =>
      examinationsApi.createSchedule(examinationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examination-schedules', examinationId] });
      queryClient.invalidateQueries({ queryKey: ['examination', examinationId] });
      showSnackbar('Subject examination scheduled successfully!', 'success');
    },
    onError: (err: any) => {
      showSnackbar(err?.response?.data?.detail || 'Failed to schedule subject slot', 'error');
    },
  });

  // 4. Delete Schedule Mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: string) => examinationsApi.deleteSchedule(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examination-schedules', examinationId] });
      queryClient.invalidateQueries({ queryKey: ['examination', examinationId] });
      showSnackbar('Subject slot removed.', 'info');
    },
    onError: (err: any) => {
      showSnackbar(err?.response?.data?.detail || 'Failed to remove schedule slot', 'error');
    },
  });

  // 5. Publish Results Mutation
  const publishMutation = useMutation({
    mutationFn: (sectionId?: string) => examinationsApi.publishResults(examinationId, sectionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['examination', examinationId] });
      queryClient.invalidateQueries({ queryKey: ['examination-schedules', examinationId] });
      showSnackbar(data.message, 'success');
    },
    onError: (err: any) => {
      showSnackbar(err?.response?.data?.detail || 'Failed to publish results', 'error');
    },
  });

  if (isExamLoading) {
    return (
      <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
        <AppShell>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </AppShell>
      </RequireRole>
    );
  }

  if (!examination) {
    return (
      <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
        <AppShell>
          <Box sx={{ p: 3 }}>
            <Alert severity="error">Examination record not found.</Alert>
          </Box>
        </AppShell>
      </RequireRole>
    );
  }

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1300, mx: 'auto', p: { xs: 2, md: 3 } }}>
          {/* Back Navigation & Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/examinations')}
              sx={{ color: 'text.secondary' }}
            >
              Back to Examinations
            </Button>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setScheduleDialogOpen(true)}
              >
                Add Subject Slot
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<PublishIcon />}
                onClick={() => setPublishDialogOpen(true)}
              >
                Publish Results
              </Button>
            </Stack>
          </Box>

          {/* Exam Header Overview Card */}
          <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {examination.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={examination.status}
                    color={examination.status === 'COMPLETED' ? 'success' : 'primary'}
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    size="small"
                    label={examination.exam_type.replace('_', ' ')}
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Academic Year: <strong>{examination.academic_year_name || '2026-2027'}</strong> • Term:{' '}
                  <strong>{examination.term}</strong> • Examination Period:{' '}
                  <strong>
                    {examination.start_date} to {examination.end_date}
                  </strong>
                </Typography>
                {examination.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {examination.description}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 3,
                    justifyContent: { xs: 'flex-start', md: 'flex-end' },
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      {schedules?.length || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Scheduled Slots
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      color={examination.published_results_count > 0 ? 'success.main' : 'text.secondary'}
                    >
                      {examination.published_results_count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Published Report Cards
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Tabs Navigation */}
          <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} sx={{ mb: 3 }}>
            <Tab icon={<CalendarMonthIcon />} iconPosition="start" label="Subject Timetable & Slots" />
            <Tab icon={<HistoryEduIcon />} iconPosition="start" label="Class Conduction & Marks Status" />
          </Tabs>

          {/* Tab 0: Schedules */}
          {tabIndex === 0 && (
            <ExaminationScheduleTable
              schedules={schedules || []}
              isLoading={isSchedulesLoading}
              onDeleteSchedule={(id) => deleteScheduleMutation.mutate(id)}
            />
          )}

          {/* Tab 1: Section Marks Overview */}
          {tabIndex === 1 && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Grade & Section Marks Conduction Overview
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Marks entry is strictly performed by the assigned Class Teacher of each section. Once submitted, administrators can verify completion and publish final results.
              </Alert>

              <ExaminationScheduleTable
                schedules={schedules || []}
                isLoading={isSchedulesLoading}
              />
            </Paper>
          )}

          {/* Schedule Subject Dialog */}
          <ScheduleSubjectDialog
            open={scheduleDialogOpen}
            onClose={() => setScheduleDialogOpen(false)}
            examination={examination}
            onSubmit={async (payload) => {
              await addScheduleMutation.mutateAsync(payload);
            }}
            isSubmitting={addScheduleMutation.isPending}
          />

          {/* Publish Results Dialog */}
          <PublishResultsDialog
            open={publishDialogOpen}
            onClose={() => setPublishDialogOpen(false)}
            examination={examination}
            schedules={schedules || []}
            onConfirm={async (secId) => {
              await publishMutation.mutateAsync(secId);
            }}
            isSubmitting={publishMutation.isPending}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}

