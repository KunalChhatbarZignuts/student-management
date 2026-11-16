'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { StudentFeeAdjustmentPayload } from '@/features/fees/api';

export interface FeeAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  form: StudentFeeAdjustmentPayload;
  onChangeForm: (form: StudentFeeAdjustmentPayload) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function FeeAdjustmentDialog({
  open,
  onClose,
  form,
  onChangeForm,
  onSubmit,
  isSubmitting,
}: FeeAdjustmentDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Apply Concession or Fee Adjustment</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={form.category}
                onChange={(e) =>
                  onChangeForm({
                    ...form,
                    category: e.target.value as any,
                    adjustment_type:
                      e.target.value === 'additional_charge'
                        ? 'additional_charge'
                        : e.target.value === 'discount'
                        ? 'early_bird_discount'
                        : 'merit_scholarship',
                  })
                }
              >
                <MenuItem value="concession">Concession / Scholarship</MenuItem>
                <MenuItem value="discount">Discount</MenuItem>
                <MenuItem value="additional_charge">Additional Charge</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Adjustment Identifier / Type"
              fullWidth
              required
              value={form.adjustment_type}
              onChange={(e) => onChangeForm({ ...form, adjustment_type: e.target.value })}
              placeholder="e.g. sibling_concession or merit_scholarship"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description / Reason"
              fullWidth
              required
              placeholder="e.g. 10% Sibling Concession or Academic Excellence Grant"
              value={form.description}
              onChange={(e) => onChangeForm({ ...form, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Calculation Type</InputLabel>
              <Select
                label="Calculation Type"
                value={form.calculation_type}
                onChange={(e) =>
                  onChangeForm({
                    ...form,
                    calculation_type: e.target.value as any,
                    rate: e.target.value === 'percentage' ? 10 : null,
                  })
                }
              >
                <MenuItem value="fixed">Fixed Amount (₹)</MenuItem>
                <MenuItem value="percentage">Percentage (%)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {form.calculation_type === 'percentage' ? (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Percentage Rate (%)"
                type="number"
                required
                fullWidth
                value={form.rate ?? ''}
                onChange={(e) =>
                  onChangeForm({
                    ...form,
                    rate: parseFloat(e.target.value) || 0,
                    amount: 0,
                  })
                }
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
            </Grid>
          ) : (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fixed Amount (₹)"
                type="number"
                required
                fullWidth
                value={form.amount}
                onChange={(e) =>
                  onChangeForm({
                    ...form,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={isSubmitting || !form.description.trim()}
        >
          {isSubmitting ? 'Applying...' : 'Apply & Recalculate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

