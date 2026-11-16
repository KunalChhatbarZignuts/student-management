'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

interface ApplyLeaveDialogProps {
  open: boolean;
  onClose: () => void;
  isParent: boolean;
  isSubmitting: boolean;
  onSubmit: (data: { startDate: string; endDate: string; reason: string }) => void;
}

export const ApplyLeaveDialog: React.FC<ApplyLeaveDialogProps> = ({
  open,
  onClose,
  isParent,
  isSubmitting,
  onSubmit,
}) => {
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');

  React.useEffect(() => {
    if (open) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
      setReason('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ startDate, endDate, reason });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      component="form"
      onSubmit={handleSubmit}
    >
      <DialogTitle>
        {isParent ? 'Submit Leave Request for Child' : 'New Leave Application'}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              label="Start Date"
              type="date"
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextField
              label="End Date"
              type="date"
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Box>

          <TextField
            label="Reason for Leave"
            placeholder="Please state the specific reason for your absence (e.g., family wedding, medical appointment)..."
            multiline
            rows={4}
            required
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            helperText="Your assigned Class Teacher will review this request."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

