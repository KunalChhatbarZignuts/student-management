'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentsApi } from '../api';
import { apiClient } from '@/lib/axios';

interface StudentTransferModalProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  currentGradeName?: string | null;
  currentSectionName?: string | null;
  onSuccess: () => void;
}

export default function StudentTransferModal({
  open,
  onClose,
  studentId,
  studentName,
  currentGradeName,
  currentSectionName,
  onSuccess,
}: StudentTransferModalProps) {
  const queryClient = useQueryClient();
  const [targetGradeId, setTargetGradeId] = React.useState('');
  const [targetSectionId, setTargetSectionId] = React.useState('');
  const [transferType, setTransferType] = React.useState<'SECTION_TRANSFER' | 'GRADE_TRANSFER'>('SECTION_TRANSFER');
  const [reason, setReason] = React.useState('');
  const [remarks, setRemarks] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Fetch Grades
  const { data: grades = [] } = useQuery({
    queryKey: ['grades-list-all'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/grades?size=100');
      return res.data?.items || [];
    },
    enabled: open,
  });

  // Fetch Sections for selected grade
  const { data: sections = [] } = useQuery({
    queryKey: ['sections-for-transfer', targetGradeId],
    queryFn: async () => {
      if (!targetGradeId) return [];
      const res = await apiClient.get<any[]>(`/grades/${targetGradeId}/sections`);
      return res.data || [];
    },
    enabled: !!targetGradeId,
  });

  const transferMutation = useMutation({
    mutationFn: enrollmentsApi.transferStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['student-details', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-enrollments', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.detail || 'Failed to complete student transfer.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!targetSectionId) {
      setErrorMessage('Please select target section.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Please provide a mandatory reason for the transfer.');
      return;
    }
    transferMutation.mutate({
      student_id: studentId,
      target_section_id: targetSectionId,
      target_grade_id: targetGradeId || undefined,
      transfer_type: transferType,
      reason: reason.trim(),
      remarks: remarks.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Transfer Student: {studentName}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Current Class: <strong>{currentGradeName || '—'} - {currentSectionName || '—'}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Transferring will preserve existing attendance and examination history, close the current enrollment, and open a new active enrollment in the target section.
              </Typography>
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel id="transfer-type-label">Transfer Type</InputLabel>
              <Select
                labelId="transfer-type-label"
                value={transferType}
                label="Transfer Type"
                onChange={(e) => setTransferType(e.target.value as any)}
              >
                <MenuItem value="SECTION_TRANSFER">Intra-Grade Section Transfer (e.g. 5-A → 5-B)</MenuItem>
                <MenuItem value="GRADE_TRANSFER">Grade Level Transfer</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth required size="small">
              <InputLabel id="target-grade-label">Destination Grade</InputLabel>
              <Select
                labelId="target-grade-label"
                value={targetGradeId}
                label="Destination Grade"
                onChange={(e) => {
                  setTargetGradeId(e.target.value);
                  setTargetSectionId('');
                }}
              >
                {grades.map((g: any) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required size="small" disabled={!targetGradeId}>
              <InputLabel id="target-section-label">Destination Section</InputLabel>
              <Select
                labelId="target-section-label"
                value={targetSectionId}
                label="Destination Section"
                onChange={(e) => setTargetSectionId(e.target.value)}
              >
                {sections.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} (Capacity: {s.class_capacity ?? 'No limit'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Mandatory Transfer Reason"
              required
              fullWidth
              size="small"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Section balancing, Parental relocation request..."
            />

            <TextField
              label="Administrative Remarks (Optional)"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Internal administrative notes or coordinator approval reference..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={transferMutation.isPending} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={transferMutation.isPending || !targetSectionId}
            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 120 }}
          >
            {transferMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Confirm Transfer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

