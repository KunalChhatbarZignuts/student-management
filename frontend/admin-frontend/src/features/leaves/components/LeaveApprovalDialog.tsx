'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { LeaveApplicationItem } from '@/features/leaves/types';

export interface LeaveApprovalDialogProps {
  type: 'approve' | 'reject' | null;
  application: LeaveApplicationItem | null;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  isSubmitting: boolean;
}

export default function LeaveApprovalDialog({
  type,
  application,
  onClose,
  onConfirm,
  isSubmitting,
}: LeaveApprovalDialogProps) {
  const [remarks, setRemarks] = React.useState('');

  React.useEffect(() => {
    if (application) {
      setRemarks('');
    }
  }, [application]);

  if (!type || !application) return null;

  const isReject = type === 'reject';

  return (
    <Dialog open={Boolean(application)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>
        {isReject ? 'Reject Leave Application' : 'Approve Leave Application'}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {isReject
            ? `Please provide a reason for rejecting the leave request submitted for ${application.student_name}:`
            : `Are you sure you want to approve this leave request for ${application.student_name} (${application.start_date} to ${application.end_date})?`}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={isReject ? 'Rejection Reason *' : 'Approval Remarks (Optional)'}
          multiline
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder={isReject ? 'State reason for rejection...' : 'Optional comment...'}
          required={isReject}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={isReject ? 'error' : 'success'}
          disabled={isSubmitting || (isReject && !remarks.trim())}
          onClick={() => onConfirm(remarks)}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? (isReject ? 'Rejecting...' : 'Approving...') : (isReject ? 'Reject Leave' : 'Confirm Approval')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

