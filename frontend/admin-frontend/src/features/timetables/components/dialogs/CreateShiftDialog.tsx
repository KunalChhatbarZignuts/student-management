'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

import AppTimePicker from '@/components/ui/AppTimePicker';
import { Grade } from '@/features/grades/types';

export interface CreateShiftFormState {
  name: string;
  start_time: string;
  end_time: string;
  working_days: string;
  assigned_grade_ids: string[];
}

export interface CreateShiftDialogProps {
  open: boolean;
  onClose: () => void;
  form: CreateShiftFormState;
  onChangeForm: (form: CreateShiftFormState) => void;
  grades: Grade[];
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function CreateShiftDialog({
  open,
  onClose,
  form,
  onChangeForm,
  grades,
  onSubmit,
  isSubmitting,
}: CreateShiftDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New School Shift</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Shift Name"
            size="small"
            fullWidth
            required
            value={form.name}
            onChange={(e) => onChangeForm({ ...form, name: e.target.value })}
            placeholder="e.g. Morning Shift"
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <AppTimePicker
                label="Shift Start Time"
                required
                value={form.start_time}
                onChange={(val) => onChangeForm({ ...form, start_time: val })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppTimePicker
                label="Shift End Time"
                required
                value={form.end_time}
                onChange={(val) => onChangeForm({ ...form, end_time: val })}
              />
            </Grid>
          </Grid>
          <TextField
            label="Working Days (comma separated)"
            size="small"
            fullWidth
            value={form.working_days}
            onChange={(e) => onChangeForm({ ...form, working_days: e.target.value })}
            placeholder="Monday,Tuesday,Wednesday,Thursday,Friday"
          />
          <FormControl fullWidth size="small">
            <InputLabel id="create-shift-grades-label">Assign to Grades (Optional)</InputLabel>
            <Select
              labelId="create-shift-grades-label"
              multiple
              value={form.assigned_grade_ids}
              label="Assign to Grades (Optional)"
              onChange={(e) => {
                const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                onChangeForm({ ...form, assigned_grade_ids: val });
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
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!form.name || !form.start_time || !form.end_time || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? 'Creating...' : 'Create Shift'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

