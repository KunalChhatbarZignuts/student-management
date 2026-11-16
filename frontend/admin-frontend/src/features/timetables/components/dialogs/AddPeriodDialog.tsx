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
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import AppTimePicker from '@/components/ui/AppTimePicker';

export interface AddPeriodFormState {
  number: number;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

export interface AddPeriodDialogProps {
  open: boolean;
  onClose: () => void;
  form: AddPeriodFormState;
  onChangeForm: (form: AddPeriodFormState) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function AddPeriodDialog({
  open,
  onClose,
  form,
  onChangeForm,
  onSubmit,
  isSubmitting,
}: AddPeriodDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Period to Shift</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Period Number"
            type="number"
            size="small"
            fullWidth
            value={form.number}
            onChange={(e) => onChangeForm({ ...form, number: parseInt(e.target.value) || 1 })}
          />
          <TextField
            label="Period Name (optional)"
            size="small"
            fullWidth
            value={form.name}
            onChange={(e) => onChangeForm({ ...form, name: e.target.value })}
            placeholder="e.g. Period 1 or Morning Recess"
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <AppTimePicker
                label="Period Start Time"
                required
                value={form.start_time}
                onChange={(val) => onChangeForm({ ...form, start_time: val })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <AppTimePicker
                label="Period End Time"
                required
                value={form.end_time}
                onChange={(val) => onChangeForm({ ...form, end_time: val })}
              />
            </Grid>
          </Grid>
          <FormControlLabel
            control={
              <Switch
                checked={form.is_break}
                onChange={(e) => onChangeForm({ ...form, is_break: e.target.checked })}
              />
            }
            label="Mark as Break / Recess Period"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!form.start_time || !form.end_time || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? 'Adding...' : 'Add Period'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

