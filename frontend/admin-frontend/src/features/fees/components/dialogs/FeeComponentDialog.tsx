'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import { FeeComponent, FeeComponentCreatePayload } from '@/features/fees/api';

export interface FeeComponentDialogProps {
  open: boolean;
  onClose: () => void;
  editingComponent: FeeComponent | null;
  form: FeeComponentCreatePayload;
  onChangeForm: (form: FeeComponentCreatePayload) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function FeeComponentDialog({
  open,
  onClose,
  editingComponent,
  form,
  onChangeForm,
  onSubmit,
  isSubmitting,
}: FeeComponentDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingComponent ? 'Edit Fee Component' : 'Add Fee Component'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Component Name"
              required
              fullWidth
              placeholder="e.g. Tuition Fee"
              value={form.name}
              onChange={(e) => onChangeForm({ ...form, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Component Code"
              required
              fullWidth
              placeholder="e.g. TUITION"
              disabled={Boolean(editingComponent)}
              value={form.code}
              onChange={(e) => onChangeForm({ ...form, code: e.target.value.toUpperCase() })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Fee Type</InputLabel>
              <Select
                label="Fee Type"
                value={form.fee_type}
                onChange={(e) => onChangeForm({ ...form, fee_type: e.target.value })}
              >
                <MenuItem value="tuition">Tuition</MenuItem>
                <MenuItem value="admission">Admission</MenuItem>
                <MenuItem value="transport">Transport</MenuItem>
                <MenuItem value="activity">Activity</MenuItem>
                <MenuItem value="exam">Examination</MenuItem>
                <MenuItem value="other">Other / Custom</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Payment Frequency</InputLabel>
              <Select
                label="Payment Frequency"
                value={form.payment_frequency}
                onChange={(e) => onChangeForm({ ...form, payment_frequency: e.target.value })}
              >
                <MenuItem value="one_time">One-time</MenuItem>
                <MenuItem value="annual">Annually</MenuItem>
                <MenuItem value="half_yearly">Half-Yearly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={form.description}
              onChange={(e) => onChangeForm({ ...form, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_mandatory}
                  onChange={(e) => onChangeForm({ ...form, is_mandatory: e.target.checked })}
                />
              }
              label="Mandatory Component"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_recurring}
                  onChange={(e) => onChangeForm({ ...form, is_recurring: e.target.checked })}
                />
              }
              label="Recurring Charge"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Component'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

