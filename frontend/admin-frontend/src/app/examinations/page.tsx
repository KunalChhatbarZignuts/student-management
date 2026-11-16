'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PublishIcon from '@mui/icons-material/Publish';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import PageHeader from '@/components/ui/PageHeader';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { ROLES } from '@/lib/constants';
import { examinationsApi } from '@/features/examinations/api';
import {
  CreateExaminationDialog,
  ExaminationDashboardCards,
} from '@/features/examinations/components';
import { CreateExaminationPayload, Examination } from '@/features/examinations/types';

export default function ExaminationsAdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [termFilter, setTermFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  // 1. Fetch Metrics
  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ['examinations', 'metrics'],
    queryFn: examinationsApi.getDashboardMetrics,
  });

  // 2. Fetch Examinations
  const { data: examinations, isLoading: isExamsLoading } = useQuery({
    queryKey: ['examinations', 'list', termFilter, statusFilter],
    queryFn: () =>
      examinationsApi.listExaminations({
        term: termFilter === 'all' ? undefined : termFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  // 3. Create Examination Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateExaminationPayload) => examinationsApi.createExamination(payload),
    onSuccess: (newExam) => {
      queryClient.invalidateQueries({ queryKey: ['examinations'] });
      showSnackbar(`Examination "${newExam.name}" scheduled successfully!`, 'success');
      router.push(`/examinations/${newExam.id}`);
    },
    onError: (err: any) => {
      showSnackbar(err?.response?.data?.detail || 'Failed to create examination', 'error');
    },
  });

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Chip size="small" label="Completed" color="success" sx={{ fontWeight: 600 }} />;
      case 'ONGOING':
        return <Chip size="small" label="Ongoing" color="warning" sx={{ fontWeight: 600 }} />;
      case 'SCHEDULED':
        return <Chip size="small" label="Scheduled" color="primary" sx={{ fontWeight: 600 }} />;
      case 'DRAFT':
        return <Chip size="small" label="Draft" variant="outlined" sx={{ fontWeight: 600 }} />;
      case 'CANCELLED':
        return <Chip size="small" label="Cancelled" color="error" sx={{ fontWeight: 600 }} />;
      default:
        return <Chip size="small" label={status} />;
    }
  };

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1300, mx: 'auto', p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <PageHeader
              title="Examination Management"
              subtitle="Offline school examination setup, subject scheduling, marks monitoring, and official result publication."
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ fontWeight: 600 }}
            >
              New Examination
            </Button>
          </Box>

          {/* Statistical KPI Cards */}
          <ExaminationDashboardCards metrics={metrics} isLoading={isMetricsLoading} />

          {/* Filters Bar */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'center',
            }}
          >
            <TextField
              select
              size="small"
              label="Academic Term"
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Terms</MenuItem>
              <MenuItem value="Term 1">Term 1</MenuItem>
              <MenuItem value="Term 2">Term 2</MenuItem>
              <MenuItem value="Term 3">Term 3</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Exam Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="SCHEDULED">Scheduled</MenuItem>
              <MenuItem value="ONGOING">Ongoing</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
            </TextField>
          </Paper>

          {/* Examinations List Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Examination Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Academic Term</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Exam Period</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Subject Slots</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Published Results</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isExamsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                      Loading examinations...
                    </TableCell>
                  </TableRow>
                ) : !examinations || examinations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5 }}>
                      <Typography variant="body1" color="text.secondary">
                        No examinations match the selected filter criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  examinations.map((exam) => (
                    <TableRow key={exam.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {exam.name}
                        </Typography>
                        {exam.description && (
                          <Typography variant="caption" color="text.secondary">
                            {exam.description}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={exam.exam_type.replace('_', ' ')}
                          variant="outlined"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{exam.term}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {exam.academic_year_name || '2026-2027'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {exam.start_date} to {exam.end_date}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {exam.total_schedules} slots
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" fontWeight={600} color={exam.published_results_count > 0 ? 'success.main' : 'text.secondary'}>
                          {exam.published_results_count} students
                        </Typography>
                      </TableCell>

                      <TableCell>{getStatusChip(exam.status)}</TableCell>

                      <TableCell sx={{ textAlign: 'right' }}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => router.push(`/examinations/${exam.id}`)}
                          >
                            Manage
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Create Examination Dialog */}
          <CreateExaminationDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            onSubmit={async (payload) => {
              await createMutation.mutateAsync(payload);
            }}
            isSubmitting={createMutation.isPending}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}
