'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';

import StatusChip from '@/components/ui/StatusChip';

export interface StudentAttendanceTabProps {
  attendanceInfo: any;
  leaveApplications: any[];
}

export default function StudentAttendanceTab({
  attendanceInfo: att,
  leaveApplications = [],
}: StudentAttendanceTabProps) {
  return (
    <Grid container spacing={3}>
      {/* Analytics Header Metrics */}
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.default' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={2.4}>
              <Typography variant="caption" color="text.secondary">Total Sessions</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{att?.total_days || 0}</Typography>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Typography variant="caption" color="text.secondary">Days Present</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>{att?.present_days || 0}</Typography>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Typography variant="caption" color="text.secondary">Days Absent</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>{att?.absent_days || 0}</Typography>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Typography variant="caption" color="text.secondary">Late / Excused</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>{(att?.late_days || 0) + (att?.excused_days || 0)}</Typography>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Typography variant="caption" color="text.secondary">Attendance Rate</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>{att?.attendance_rate_percentage || 0}%</Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(att?.attendance_rate_percentage || 0, 100)}
                sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Recent Attendance Records */}
      <Grid item xs={12} md={7}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Recent Daily Attendance (Last 30 Records)</Typography>
            {att?.recent_history && att.recent_history.length > 0 ? (
              <TableContainer sx={{ maxHeight: 360 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Period / Subject</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {att.recent_history.map((rec: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{rec.date}</TableCell>
                        <TableCell>
                          <StatusChip status={rec.status?.toLowerCase()} />
                        </TableCell>
                        <TableCell>
                          {rec.period_slot || 'Daily'}{rec.subject_name ? ` • ${rec.subject_name}` : ''}
                        </TableCell>
                        <TableCell>{rec.remarks || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No attendance records logged for this student yet.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Leave Applications */}
      <Grid item xs={12} md={5}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Leave Applications</Typography>
            {leaveApplications && leaveApplications.length > 0 ? (
              <Stack spacing={2}>
                {leaveApplications.map((lv: any) => (
                  <Paper key={lv.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {lv.start_date} to {lv.end_date} ({lv.days_count} day{lv.days_count > 1 ? 's' : ''})
                      </Typography>
                      <StatusChip status={lv.status?.toLowerCase()} />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      <strong>Reason:</strong> {lv.reason}
                    </Typography>
                    {lv.reviewed_by_teacher_name && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Reviewed by: {lv.reviewed_by_teacher_name} {lv.rejection_reason ? `(${lv.rejection_reason})` : ''}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Alert severity="info">No leave applications filed by this student.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

