import * as React from 'react';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

export interface SpecialWorkingDayDialogProps {
  open: boolean;
  onClose: () => void;
  specialDate: string;
  onSpecialDateChange: (val: string) => void;
  specialReason: string;
  onSpecialReasonChange: (val: string) => void;
  onConfirm: () => void;
  isSaving: boolean;
}

export const SpecialWorkingDayDialog: React.FC<SpecialWorkingDayDialogProps> = ({
  open,
  onClose,
  specialDate,
  onSpecialDateChange,
  specialReason,
  onSpecialReasonChange,
  onConfirm,
  isSaving,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Compensatory Working Day</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Declaring a weekend as working enables attendance roll-calls on that day.
        </Typography>
        <DatePicker
          label="Date"
          value={specialDate ? dayjs(specialDate) : null}
          onChange={(newVal) =>
            onSpecialDateChange(newVal ? newVal.format('YYYY-MM-DD') : '')
          }
          sx={{ mb: 2, width: '100%' }}
          slotProps={{ textField: { fullWidth: true, required: true } }}
        />
        <TextField
          fullWidth
          label="Compensatory Reason"
          placeholder="e.g. Compensation for heavy rain day"
          multiline
          rows={2}
          value={specialReason}
          onChange={(e) => onSpecialReasonChange(e.target.value)}
          required
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!specialDate || !specialReason.trim() || isSaving}
          onClick={onConfirm}
        >
          {isSaving ? 'Saving...' : 'Add Working Day'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

