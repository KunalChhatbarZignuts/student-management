'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import { AttendanceSummary } from '@/features/academic/api';

interface ChildAttendanceTabProps {
  attendance?: AttendanceSummary | null;
  isLoading: boolean;
}

export const ChildAttendanceTab: React.FC<ChildAttendanceTabProps> = ({
  attendance,
  isLoading,
}) => {
  if (isLoading) {
    return <Skeleton variant="rounded" height={240} />;
  }

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">TOTAL CLASSES</Typography>
              <Typography variant="h4" fontWeight={700}>{attendance?.total_classes ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">ATTENDED CLASSES</Typography>
              <Typography variant="h4" fontWeight={700} color="success.main">{attendance?.attended_classes ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">EXCUSED ABSENCES</Typography>
              <Typography variant="h4" fontWeight={700} color="warning.main">{attendance?.excused_absences ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">ATTENDANCE RATE</Typography>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {attendance?.percentage ?? 100}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={attendance?.percentage ?? 100}
                sx={{ mt: 1, borderRadius: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Attendance Log
        </Typography>
        {(!attendance?.records || attendance.records.length === 0) ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No attendance sessions recorded yet for this student.
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendance.records.map((r, i) => (
                  <TableRow key={r.id || i} hover>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.status.toUpperCase()}
                        size="small"
                        color={r.status === 'present' ? 'success' : r.status === 'excused' ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{r.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
