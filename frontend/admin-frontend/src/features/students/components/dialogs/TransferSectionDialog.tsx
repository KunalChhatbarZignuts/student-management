'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { adminStudentApi, studentKeys } from '@/features/students/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

export interface TransferSectionDialogProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  studentCode: string;
  currentGradeName?: string | null;
  currentSectionName?: string | null;
  currentGradeId?: string | null;
  currentSectionId?: string | null;
}

export default function TransferSectionDialog({
  open,
  onClose,
  studentId,
  studentName,
  studentCode,
  currentGradeName,
  currentSectionName,
  currentGradeId,
  currentSectionId,
}: TransferSectionDialogProps) {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [targetGradeId, setTargetGradeId] = React.useState<string>(currentGradeId || '');
  const [targetSectionId, setTargetSectionId] = React.useState<string>('');
  const [effectiveDate, setEffectiveDate] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = React.useState<string>('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Sync state when dialog opens
  React.useEffect(() => {
    if (open) {
      setTargetGradeId(currentGradeId || '');
      setTargetSectionId('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setReason('');
      setErrorMsg(null);
    }
  }, [open, currentGradeId]);

  // Fetch all active grades
  const { data: rawGradesList } = useQuery({
    queryKey: gradeKeys.list({ status: 'active', size: 100 }),
    queryFn: () => adminGradeApi.listGrades({ status: 'active', size: 100 }),
    enabled: open,
  });
  const gradesList: any[] = Array.isArray(rawGradesList)
    ? rawGradesList
    : ((rawGradesList as any)?.items || []);

  // Fetch sections for target grade
  const selectedGradeId = targetGradeId || currentGradeId || '';
  const { data: rawSectionsList, isLoading: isLoadingSections } = useQuery({
    queryKey: ['sections-for-transfer', selectedGradeId],
    queryFn: () => adminGradeApi.getGradeSections(selectedGradeId),
    enabled: open && Boolean(selectedGradeId),
  });
  const sectionsList: any[] = Array.isArray(rawSectionsList)
    ? rawSectionsList
    : ((rawSectionsList as any)?.items || []);

  // Filter out the current section so admin can't transfer to same section
  const availableSections = sectionsList.filter(
    (s: any) => s.id !== currentSectionId && s.status === 'active'
  );

  const transferMutation = useMutation({
    mutationFn: () =>
      adminStudentApi.transferSection(studentId, {
        target_section_id: targetSectionId,
        target_grade_id: targetGradeId || undefined,
        transfer_date: effectiveDate || undefined,
        reason: reason.trim(),
      }),
    onSuccess: (data) => {
      showSnackbar(
        `Successfully transferred student to Section ${data.section_name || 'selected'}`,
        'success'
      );
      queryClient.invalidateQueries({ queryKey: studentKeys.details(studentId) });
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      onClose();
    },
    onError: (err) => {
      const msg = formatErrorMessage(err, 'Failed to transfer section');
      setErrorMsg(msg);
      showSnackbar(msg, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSectionId) {
      setErrorMsg('Please select a target section to proceed.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setErrorMsg('Please provide a transfer reason (at least 3 characters).');
      return;
    }
    setErrorMsg(null);
    transferMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <SwapHorizIcon color="primary" /> Transfer Student Section
        </DialogTitle>

        <DialogContent dividers>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
              {errorMsg}
            </Alert>
          )}

          {/* Student Overview Strip */}
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              bgcolor: 'grey.50',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {studentName} ({studentCode})
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Current Enrollment:
              </Typography>
              <Chip
                label={`${currentGradeName || 'Grade'} - ${currentSectionName || 'Section'}`}
                color="primary"
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Target Grade Selector */}
            <TextField
              select
              label="Grade / Class"
              fullWidth
              value={targetGradeId}
              onChange={(e) => {
                setTargetGradeId(e.target.value);
                setTargetSectionId(''); // reset section on grade switch
              }}
              helperText="You may keep the same grade or select a different academic grade."
            >
              {gradesList.map((g: any) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name} ({g.code || 'Grade'})
                </MenuItem>
              ))}
            </TextField>

            {/* Target Section Selector */}
            <TextField
              select
              label="Target Section"
              fullWidth
              required
              value={targetSectionId}
              onChange={(e) => setTargetSectionId(e.target.value)}
              disabled={isLoadingSections || availableSections.length === 0}
              helperText={
                isLoadingSections
                  ? 'Loading sections...'
                  : availableSections.length === 0
                  ? 'No alternative active sections available in this grade.'
                  : 'Select the section the student is transferring to.'
              }
            >
              {availableSections.map((sec: any) => (
                <MenuItem key={sec.id} value={sec.id}>
                  Section {sec.name}
                </MenuItem>
              ))}
            </TextField>

            {/* Effective Transfer Date */}
            <TextField
              label="Effective Date"
              type="date"
              fullWidth
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="The date the transfer officially takes effect in the school register."
            />

            {/* Reason for Transfer */}
            <TextField
              label="Transfer Reason"
              multiline
              rows={3}
              fullWidth
              required
              placeholder="e.g. Schedule optimization, balancing student count, academic stream alignment, or parental request."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              helperText="Mandatory justification recorded permanently in student enrollment history audit."
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={transferMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={
              transferMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SwapHorizIcon />
            }
            disabled={transferMutation.isPending || !targetSectionId}
          >
            {transferMutation.isPending ? 'Processing Transfer...' : 'Confirm Section Transfer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

