import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CloseIcon from '@mui/icons-material/Close';

import { StudentAttendanceHistoryResponse } from '@/features/attendance/types';

export interface StudentAttendanceHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  studentHistory?: StudentAttendanceHistoryResponse | null;
}

export const StudentAttendanceHistoryDrawer: React.FC<StudentAttendanceHistoryDrawerProps> = ({
  open,
  onClose,
  loading,
  studentHistory,
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 500 }, p: 3 } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Student Attendance History
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !studentHistory ? (
        <Typography variant="body2" color="text.secondary">
          No attendance records found for this student.
        </Typography>
      ) : (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6">{studentHistory.student_name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {studentHistory.grade_name} – {studentHistory.section_name} |{' '}
              {studentHistory.enrollment_number || studentHistory.student_code}
            </Typography>
          </Box>

          {/* Metrics */}
          <Grid container spacing={1} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'action.hover' }}>
                <Typography variant="caption">Total Sessions</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {studentHistory.total_working_days}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.50' }}>
                <Typography variant="caption" color="success.dark">
                  Present
                </Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {studentHistory.present_days}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'error.50' }}>
                <Typography variant="caption" color="error.dark">
                  Absent
                </Typography>
                <Typography variant="h6" fontWeight={700} color="error.main">
                  {studentHistory.absent_days}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'primary.50' }}>
                <Typography variant="caption" color="primary.dark">
                  Overall Attendance Percentage
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {studentHistory.attendance_percentage}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Session Timeline
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell>
                    <strong>Date</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Remarks</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studentHistory.records.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{r.date}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={r.status}
                        size="small"
                        color={
                          r.status === 'PRESENT'
                            ? 'success'
                            : r.status === 'ABSENT'
                            ? 'error'
                            : 'warning'
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{r.remark || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Drawer>
  );
};

