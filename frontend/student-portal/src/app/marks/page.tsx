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
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { useMyChildren } from '@/features/parents/hooks';
import { academicApi } from '@/features/academic/api';

export default function MarksPage() {
  const { role } = useAuth();
  const isParent = role === ROLES.PARENT;

  const { data: children } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const selectedChild = children && children.length > 0 ? children[selectedChildIndex] : null;

  const { data: marks, isLoading } = useQuery({
    queryKey: ['academic', 'marks', isParent ? selectedChild?.id : 'me'],
    queryFn: () => {
      if (isParent) {
        if (!selectedChild?.id) return [];
        return academicApi.getChildMarks(selectedChild.id);
      }
      return academicApi.getMyMarks();
    },
    enabled: isParent ? Boolean(selectedChild?.id) : true,
  });

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Marks & Academic Evaluation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Current term grading reports and subject evaluation breakdowns.
            </Typography>
          </Box>

          {isParent && children && children.length > 1 && (
            <Tabs
              value={selectedChildIndex}
              onChange={(_, val) => setSelectedChildIndex(val)}
              sx={{ mb: 3 }}
            >
              {children.map((child, idx) => (
                <Tab key={child.id} label={`${child.first_name} ${child.last_name}`} />
              ))}
            </Tabs>
          )}

          <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Subject Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Course Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Max Score</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Obtained Score</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Loading evaluation records...
                    </TableCell>
                  </TableRow>
                ) : !marks || marks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      No evaluation marks published for this term yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  marks.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{row.subject}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{row.code}</TableCell>
                      <TableCell>{row.max_score}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row.obtained_score}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.grade}
                          color={row.grade.startsWith('A') ? 'primary' : 'default'}
                          size="small"
                          sx={{ fontWeight: 700, minWidth: 42 }}
                        />
                      </TableCell>
                      <TableCell>
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

          <Alert severity="info">
            Official semester grade sheets and transcripts are published by the academic board at the close of every evaluation cycle.
          </Alert>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
