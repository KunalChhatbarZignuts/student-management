import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { AttendanceRecordItem, AttendanceStatusType } from '@/features/attendance/types';

export interface AdminEditAttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  recordToEdit: AttendanceRecordItem | null;
  editStatus: AttendanceStatusType;
  onStatusChange: (status: AttendanceStatusType) => void;
  editReason: string;
  onReasonChange: (reason: string) => void;
  editRemark: string;
  onRemarkChange: (remark: string) => void;
  editError: string | null;
  onClearError: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export const AdminEditAttendanceDialog: React.FC<AdminEditAttendanceDialogProps> = ({
  open,
  onClose,
  recordToEdit,
  editStatus,
  onStatusChange,
  editReason,
  onReasonChange,
  editRemark,
  onRemarkChange,
  editError,
  onClearError,
  onSave,
  isSaving,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Correct Attendance Record</DialogTitle>
      <DialogContent>
        {editError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
            {editError}
          </Alert>
        )}
        {recordToEdit && (
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Student: <strong>{recordToEdit.student_name}</strong> (
              {recordToEdit.enrollment_number || recordToEdit.student_code})
            </Typography>

            <Box sx={{ my: 2 }}>
              <Typography variant="caption" display="block" gutterBottom>
                New Attendance Status:
              </Typography>
              <ToggleButtonGroup
                size="small"
                value={editStatus}
                exclusive
                onChange={(_, val) => val && onStatusChange(val)}
                fullWidth
              >
                <ToggleButton value="PRESENT" color="success">
                  Present
                </ToggleButton>
                <ToggleButton value="ABSENT" color="error">
                  Absent
                </ToggleButton>
                <ToggleButton value="LATE" color="warning">
                  Late
                </ToggleButton>
                <ToggleButton value="EXCUSED" color="info">
                  Excused
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              fullWidth
              size="small"
              label="Mandatory Reason for Correction *"
              placeholder="e.g. Doctor's medical certificate submitted by parent"
              value={editReason}
              onChange={(e) => onReasonChange(e.target.value)}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              size="small"
              label="Optional Remark"
              placeholder="e.g. Approved medical leave"
              value={editRemark}
              onChange={(e) => onRemarkChange(e.target.value)}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={isSaving || !editReason.trim()}
        >
          {isSaving ? 'Saving...' : 'Save Correction'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

