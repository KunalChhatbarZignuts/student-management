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
import Alert from '@mui/material/Alert';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';

interface SubjectMark {
  subject: string;
  code: string;
  maxScore: number;
  obtainedScore: number;
  grade: string;
  status: 'Pass' | 'Fail';
}

// Ready to connect to backend endpoint when available
async function fetchStudentMarks(): Promise<SubjectMark[]> {
  return [
    { subject: 'Mathematics', code: 'MATH-101', maxScore: 100, obtainedScore: 88, grade: 'A', status: 'Pass' },
    { subject: 'Computer Science', code: 'CS-102', maxScore: 100, obtainedScore: 94, grade: 'A+', status: 'Pass' },
    { subject: 'Physics', code: 'PHY-103', maxScore: 100, obtainedScore: 79, grade: 'B+', status: 'Pass' },
    { subject: 'English Communication', code: 'ENG-104', maxScore: 100, obtainedScore: 85, grade: 'A', status: 'Pass' },
  ];
}

export default function MarksPage() {
  const { data: marks, isLoading } = useQuery({
    queryKey: ['academic', 'marks'],
    queryFn: fetchStudentMarks,
  });

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 920, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Marks & Academic Evaluation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Current term grading reports and subject evaluation breakdowns.
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Official semester grade sheets are published by the academic board at the close of every evaluation cycle.
          </Alert>

          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Course Code</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Max Marks</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Obtained</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Grade</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Loading marks...
                    </TableCell>
                  </TableRow>
                ) : (
                  marks?.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell sx={{ fontWeight: 600 }}>{row.subject}</TableCell>
                      <TableCell>{row.code}</TableCell>
                      <TableCell align="right">{row.maxScore}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {row.obtainedScore}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row.grade} color="primary" size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={row.status}
                          color={row.status === 'Pass' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
