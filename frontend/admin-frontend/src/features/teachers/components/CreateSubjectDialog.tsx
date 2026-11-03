'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { teacherSubjectApi, teacherSubjectKeys } from '../subjectApi';
import { SubjectItem } from '../types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

const COMMON_DEPARTMENTS = [
  'Mathematics',
  'Science',
  'Languages & Literature',
  'Social Studies / Humanities',
  'Computer Science & IT',
  'Visual & Performing Arts',
  'Physical Education',
  'Other',
];

interface CreateSubjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (newSubject: SubjectItem) => void;
}

export default function CreateSubjectDialog({
  open,
  onClose,
  onCreated,
}: CreateSubjectDialogProps) {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [selectedDept, setSelectedDept] = React.useState('Science');
  const [customDept, setCustomDept] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: teacherSubjectApi.createSubject,
    onSuccess: (res) => {
      showSnackbar(`Subject "${res.name}" (${res.code}) created successfully!`, 'success');
      queryClient.invalidateQueries({ queryKey: teacherSubjectKeys.all });
      handleClose();
      if (onCreated) onCreated(res);
    },
    onError: (err: any) => {
      setErrorMessage(formatErrorMessage(err));
    },
  });

  const handleClose = () => {
    setName('');
    setCode('');
    setSelectedDept('Science');
    setCustomDept('');
    setErrorMessage(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Subject Name is required.');
      return;
    }
    if (!code.trim()) {
      setErrorMessage('Subject Code is required.');
      return;
    }

    const finalDept = selectedDept === 'Other' ? customDept.trim() : selectedDept;

    createMutation.mutate({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department: finalDept || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Create New Curriculum Subject
        </DialogTitle>
        <DialogContent dividers>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Subject Name *"
              placeholder="e.g. Mathematics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <TextField
              fullWidth
              size="small"
              label="Subject Code *"
              placeholder="e.g. MATH-101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              helperText="Unique uppercase identifier code"
            />
            <TextField
              select
              fullWidth
              size="small"
              label="Department *"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {COMMON_DEPARTMENTS.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>
            {selectedDept === 'Other' && (
              <TextField
                fullWidth
                size="small"
                label="Custom Department Name *"
                placeholder="e.g. Environmental Science"
                value={customDept}
                onChange={(e) => setCustomDept(e.target.value)}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isPending}
            startIcon={createMutation.isPending ? <CircularProgress size={16} /> : null}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Subject'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

