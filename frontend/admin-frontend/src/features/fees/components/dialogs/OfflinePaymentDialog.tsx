'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { FeeInstallmentItem, RecordOfflinePaymentPayload } from '@/features/fees/api';

export interface OfflinePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  payingInstallment: FeeInstallmentItem | null;
  amount: number;
  onChangeAmount: (val: number) => void;
  method: string;
  onChangeMethod: (val: string) => void;
  date: string;
  onChangeDate: (val: string) => void;
  note: string;
  onChangeNote: (val: string) => void;
  onSubmit: (installmentId: string, payload: RecordOfflinePaymentPayload) => void;
  isSubmitting: boolean;
}

export default function OfflinePaymentDialog({
  open,
  onClose,
  payingInstallment,
  amount,
  onChangeAmount,
  method,
  onChangeMethod,
  date,
  onChangeDate,
  note,
  onChangeNote,
  onSubmit,
  isSubmitting,
}: OfflinePaymentDialogProps) {
  const outstanding = Number(payingInstallment?.outstanding_amount ?? 0);

  const handleSubmit = () => {
    if (!payingInstallment) return;
    onSubmit(payingInstallment.id, {
      amount,
      payment_method: method,
      payment_date: date,
      reference_note: note || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Record Offline Payment</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Installment: <b>{payingInstallment?.installment_name}</b>
          </Typography>
          <Typography variant="body2" color="warning.main" fontWeight={600}>
            Outstanding Balance: ₹{outstanding.toLocaleString()}
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Payment Amount (₹)"
              type="number"
              required
              fullWidth
              value={amount}
              onChange={(e) => onChangeAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              helperText={`Cannot exceed outstanding ₹${outstanding.toLocaleString()}`}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Payment Mode</InputLabel>
              <Select
                label="Payment Mode"
                value={method}
                onChange={(e) => onChangeMethod(e.target.value)}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</MenuItem>
                <MenuItem value="demand_draft">Demand Draft</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Payment Date"
              type="date"
              required
              fullWidth
              value={date}
              onChange={(e) => onChangeDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Reference / Cheque No / Remarks"
              placeholder="e.g. Cheque #492810 HDFC or Cash counter ref"
              fullWidth
              multiline
              rows={2}
              value={note}
              onChange={(e) => onChangeNote(e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || amount <= 0 || amount > outstanding}
        >
          {isSubmitting ? 'Recording...' : 'Confirm Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

