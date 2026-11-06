'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import TimerIcon from '@mui/icons-material/Timer';
import EditNoteIcon from '@mui/icons-material/EditNote';

export interface TeacherAttendanceCorrectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (remark: string) => void;
  isSubmitting: boolean;
  changedCount: number;
  remainingSeconds: number;
}

export default function TeacherAttendanceCorrectionDialog({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  changedCount,
  remainingSeconds,
}: TeacherAttendanceCorrectionDialogProps) {
  const [remark, setRemark] = React.useState<string>('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setRemark('');
      setErrorMsg(null);
    }
  }, [open]);

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remark.trim() || remark.trim().length < 3) {
      setErrorMsg('A specific correction remark (at least 3 characters) is required.');
      return;
    }
    setErrorMsg(null);
    onConfirm(remark.trim());
  };

  return (
    <Dialog open={open} onClose={() => !isSubmitting && onClose()} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditNoteIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Amend Attendance Roll Call
            </Typography>
          </Box>
          <Chip
            icon={<TimerIcon />}
            label={`${formatRemaining(remainingSeconds)} left`}
            color={remainingSeconds < 300 ? 'error' : 'warning'}
            size="small"
            variant="filled"
            sx={{ fontWeight: 700 }}
          />
        </DialogTitle>

        <DialogContent dividers>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
              {errorMsg}
            </Alert>
          )}

          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            You are amending <strong>{changedCount}</strong> student attendance status
            {changedCount === 1 ? '' : 'es'} within your 30-minute grace window. All amendments are permanently logged in the school audit registry.
          </Alert>

          <TextField
            label="Correction Remark / Reason"
            required
            fullWidth
            multiline
            rows={3}
            placeholder="e.g. Student arrived 5 minutes late due to transit delay; updated from ABSENT to LATE."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            disabled={isSubmitting}
            helperText="Mandatory reason for modifying the recorded attendance roll call."
            autoFocus
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting || !remark.trim()}
            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <EditNoteIcon />}
          >
            {isSubmitting ? 'Saving Correction...' : 'Submit Amendment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

