'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

import { Shift } from '@/features/timetables/types';
import { Grade } from '@/features/grades/types';

export interface AssignGradesToShiftDialogProps {
  open: boolean;
  onClose: () => void;
  shift: Shift | null;
  selectedGradeIds: string[];
  onChangeSelectedGrades: (ids: string[]) => void;
  grades: Grade[];
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function AssignGradesToShiftDialog({
  open,
  onClose,
  shift,
  selectedGradeIds,
  onChangeSelectedGrades,
  grades,
  onSubmit,
  isSubmitting,
}: AssignGradesToShiftDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Assign Grades to {shift?.name}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select all grades that operate under this shift. Any grade previously linked to this shift
          will be updated.
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="shift-assign-grades-modal-label">Assigned Grades</InputLabel>
          <Select
            labelId="shift-assign-grades-modal-label"
            multiple
            value={selectedGradeIds}
            label="Assigned Grades"
            onChange={(e) => {
              const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
              onChangeSelectedGrades(val);
            }}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((gid) => {
                  const g = grades.find((item) => item.id === gid);
                  return <Chip key={gid} label={g?.name || gid} size="small" />;
                })}
              </Box>
            )}
          >
            {grades.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={isSubmitting || !shift}
          onClick={onSubmit}
        >
          {isSubmitting ? 'Saving...' : 'Save Assignments'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

