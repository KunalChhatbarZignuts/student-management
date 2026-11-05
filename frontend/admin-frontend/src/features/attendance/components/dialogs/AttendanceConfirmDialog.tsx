import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';

export interface AttendanceConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  summaryCounters: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  };
  onConfirm: () => void;
  isSubmitting: boolean;
}

export const AttendanceConfirmDialog: React.FC<AttendanceConfirmDialogProps> = ({
  open,
  onClose,
  selectedDate,
  summaryCounters,
  onConfirm,
  isSubmitting,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>Confirm Attendance Submission</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Please review the attendance summary before submitting for Section on {selectedDate}:
        </DialogContentText>
        <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, mb: 1 }}>
          <Typography variant="body2">
            Total Students: <strong>{summaryCounters.total}</strong>
          </Typography>
          <Typography variant="body2" color="success.main">
            Present: <strong>{summaryCounters.present}</strong>
          </Typography>
          <Typography variant="body2" color="error.main">
            Absent: <strong>{summaryCounters.absent}</strong>
          </Typography>
          <Typography variant="body2" color="warning.main">
            Late: <strong>{summaryCounters.late}</strong>
          </Typography>
          <Typography variant="body2" color="info.main">
            Excused: <strong>{summaryCounters.excused}</strong>
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" fontWeight={700}>
            Calculated Attendance Rate: {summaryCounters.percentage}%
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Confirm & Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

