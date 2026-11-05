import * as React from 'react';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

import { SchoolHoliday } from '@/features/calendar/types';

export interface CancelHolidayDialogProps {
  open: boolean;
  onClose: () => void;
  holiday: SchoolHoliday | null;
  cancelReason: string;
  onCancelReasonChange: (val: string) => void;
  onConfirm: () => void;
  isCancelling: boolean;
}

export const CancelHolidayDialog: React.FC<CancelHolidayDialogProps> = ({
  open,
  onClose,
  holiday,
  cancelReason,
  onCancelReasonChange,
  onConfirm,
  isCancelling,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Cancel Holiday</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Cancelling <strong>{holiday?.name}</strong> will reinstate these dates as regular
          working school days. An audit log entry will be preserved.
        </Typography>
        <TextField
          fullWidth
          label="Cancellation Reason"
          placeholder="e.g. Government advisory revoked, exam rescheduled"
          multiline
          rows={2}
          value={cancelReason}
          onChange={(e) => onCancelReasonChange(e.target.value)}
          required
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Back
        </Button>
        <Button
          variant="contained"
          color="warning"
          disabled={!cancelReason.trim() || isCancelling}
          onClick={onConfirm}
        >
          {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

