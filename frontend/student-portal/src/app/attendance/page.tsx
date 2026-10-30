'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useQuery } from '@tanstack/react-query';

import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { useMyChildren } from '@/features/parents/hooks';
import { academicApi } from '@/features/academic/api';

export default function AttendancePage() {
  const { role } = useAuth();
  const isParent = role === ROLES.PARENT;

  // For parent, fetch linked children
  const { data: children } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const selectedChild = children && children.length > 0 ? children[selectedChildIndex] : null;

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['academic', 'attendance', isParent ? selectedChild?.id : 'me'],
    queryFn: () => {
      if (isParent) {
        if (!selectedChild?.id) return null;
        return academicApi.getChildAttendance(selectedChild.id);
      }
      return academicApi.getMyAttendance();
    },
    enabled: isParent ? Boolean(selectedChild?.id) : true,
  });

  const percentage = attendance?.percentage ?? 100;
  const attended = attendance?.attended_classes ?? 0;
  const total = attendance?.total_classes ?? 0;
  const excused = attendance?.excused_absences ?? 0;
  const records = attendance?.records ?? [];

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Attendance Record
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Academic term attendance summary and daily roll call verification.
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

          {isLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={36} />
            </Box>
          ) : (
            <>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        OVERALL ATTENDANCE RATE
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color={percentage >= 85 ? 'success.main' : 'error.main'}>
                        {percentage}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(percentage, 100)}
                        color={percentage >= 85 ? 'success' : 'error'}
                        sx={{ height: 8, borderRadius: 4, mt: 1.5 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        CLASSES ATTENDED
                      </Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {attended} / {total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Term 1 (2026-2027)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        EXCUSED ABSENCES
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="secondary.main">
                        {excused}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Approved medical or official leave
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Attendance Log Table */}
              <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 4 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Presence Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Remarks & Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                          No attendance roll call entries recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip
                              label={r.status.toUpperCase()}
                              size="small"
                              color={
                                r.status === 'present'
                                  ? 'success'
                                  : r.status === 'excused'
                                  ? 'warning'
                                  : 'error'
                              }
                            />
                          </TableCell>
                          <TableCell>{r.notes || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <EventAvailableIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Attendance Policy Notice
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  A minimum threshold of 85% attendance across registered courses is required for regular term completion.
                  Discrepancies should be submitted through your department head.
                </Typography>
              </Paper>
            </>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
