'use client';

import * as React from 'react';
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
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import { useQuery } from '@tanstack/react-query';
import { enrollmentsApi } from '../api';
import { EnhancedEnrollmentHistoryItem } from '../types';

interface EnrollmentHistoryTimelineProps {
  studentId: string;
}

export default function EnrollmentHistoryTimeline({ studentId }: EnrollmentHistoryTimelineProps) {
  const { data: history = [], isLoading, isError } = useQuery({
    queryKey: ['student-enrollment-history', studentId],
    queryFn: () => enrollmentsApi.getStudentEnrollmentHistory(studentId),
    enabled: !!studentId,
  });

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Chip label="Active" color="success" size="small" sx={{ fontWeight: 600 }} />;
      case 'TRANSFERRED':
        return <Chip label="Transferred" color="info" size="small" sx={{ fontWeight: 600 }} />;
      case 'PROMOTED':
        return <Chip label="Promoted" color="primary" size="small" sx={{ fontWeight: 600 }} />;
      case 'REPEATED':
        return <Chip label="Repeated" color="warning" size="small" sx={{ fontWeight: 600 }} />;
      case 'LEFT':
        return <Chip label="Left School" color="error" size="small" sx={{ fontWeight: 600 }} />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Card elevation={0} variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <HistoryEduIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Academic Enrollment & Transfer History
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Complete chronological record of grades, sections, assigned class teachers, and official transfer reasons.
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : isError ? (
          <Alert severity="error">Unable to load enrollment history for this student.</Alert>
        ) : history.length === 0 ? (
          <Alert severity="info">No historical enrollment records found.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Academic Year</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Grade & Section</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Roll #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Class Teacher</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Enrollment Period</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Transfer Reason / Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((h: EnhancedEnrollmentHistoryItem) => (
                  <TableRow key={h.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {h.academic_year_name || 'Academic Year'}
                    </TableCell>
                    <TableCell>
                      {h.grade_name || 'Grade'} - {h.section_name || 'Section'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{h.roll_no}</TableCell>
                    <TableCell>{h.class_teacher_name || '—'}</TableCell>
                    <TableCell>
                      {h.enrollment_date} {h.left_on ? `→ ${h.left_on}` : '(Present)'}
                    </TableCell>
                    <TableCell>{getStatusChip(h.status)}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      {h.reason ? (
                        <Box>
                          <Typography variant="caption" display="block" fontWeight={600}>
                            {h.reason}
                          </Typography>
                          {h.remarks && (
                            <Typography variant="caption" color="text.secondary">
                              {h.remarks}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

