'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';

import { Section } from '@/features/grades/types';

export interface AssignClassTeacherDialogProps {
  section: Section | null;
  onClose: () => void;
  onAssign: (teacherId: string) => void;
  isSubmitting: boolean;
  teachers?: any[];
}

export default function AssignClassTeacherDialog({
  section,
  onClose,
  onAssign,
  isSubmitting,
  teachers = [],
}: AssignClassTeacherDialogProps) {
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>('');

  React.useEffect(() => {
    if (section) {
      setSelectedTeacherId(section.assigned_teacher_id || '');
    }
  }, [section]);

  if (!section) return null;

  return (
    <Dialog open={Boolean(section)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>
        Assign Class Teacher: Section {section.name}
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          select
          label="Select Faculty Member"
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          sx={{ mt: 1 }}
        >
          <MenuItem value="">
            <em>None (Unassign)</em>
          </MenuItem>
          {teachers.map((t) => {
            const teacherProfile = t.teacher;
            const name = teacherProfile
              ? `${teacherProfile.first_name} ${teacherProfile.last_name}`
              : t.email;
            return (
              <MenuItem key={t.id} value={teacherProfile?.id || t.id}>
                {name} {teacherProfile?.department ? `(${teacherProfile.department})` : ''}
              </MenuItem>
            );
          })}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!selectedTeacherId || isSubmitting}
          onClick={() => onAssign(selectedTeacherId)}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving...' : 'Assign Teacher'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

