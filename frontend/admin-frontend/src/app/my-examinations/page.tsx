'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SchoolIcon from '@mui/icons-material/School';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import PageHeader from '@/components/ui/PageHeader';
import { ROLES } from '@/lib/constants';
import { examinationsApi } from '@/features/examinations/api';

export default function MyExaminationsTeacherPage() {
  const router = useRouter();

  const { data: schedules, isLoading, error } = useQuery({
    queryKey: ['teacher-examinations'],
    queryFn: examinationsApi.getTeacherExaminations,
  });

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Chip size="small" label="Results Published" color="success" sx={{ fontWeight: 600 }} />;
      case 'SUBMITTED':
        return <Chip size="small" label="Submitted to Admin" color="primary" sx={{ fontWeight: 600 }} />;
      case 'DRAFT':
        return <Chip size="small" label="Draft In Progress" color="warning" sx={{ fontWeight: 600 }} />;
      default:
        return <Chip size="small" label="Pending Entry" variant="outlined" sx={{ color: 'text.secondary' }} />;
    }
  };

  return (
    <RequireRole roles={[ROLES.TEACHER]}>
      <AppShell>
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
          <PageHeader
            title="Class Teacher Examination Management"
            subtitle="Conduct offline examinations, record attendance, and enter student marks for your assigned classes."
          />

          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Class Teacher Authority:</strong> Under institutional regulations, only the designated Class Teacher is authorized to conduct examinations, enter marks, and submit final academic results for their assigned sections.
          </Alert>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">Failed to load assigned examination schedules.</Alert>
          ) : !schedules || schedules.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: '#fafafa', borderRadius: 2 }}>
              <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" fontWeight={600} color="text.secondary">
                No active examination schedules for your assigned classes.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                When administrators publish examination timetables for your section, they will appear here.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Examination & Term</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Grade & Section</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Exam Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Marks (Max / Pass)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.map((sch) => (
                    <TableRow key={sch.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {sch.exam_name}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {sch.grade_name} - {sch.section_name}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {sch.subject_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sch.subject_code}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">{sch.exam_date}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {sch.max_marks} / {sch.pass_marks}
                        </Typography>
                      </TableCell>

                      <TableCell>{getStatusChip(sch.marks_entry_status)}</TableCell>

                      <TableCell sx={{ textAlign: 'right' }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<EditNoteIcon />}
                          onClick={() => router.push(`/my-examinations/${sch.id}/marks`)}
                          disabled={sch.marks_entry_status === 'PUBLISHED'}
                        >
                          {sch.marks_entry_status === 'PUBLISHED' ? 'Published' : 'Enter Marks'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
