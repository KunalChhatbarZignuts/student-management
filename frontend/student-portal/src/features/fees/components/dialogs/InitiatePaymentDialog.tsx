import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import PaymentIcon from '@mui/icons-material/Payment';

import { PortalInstallmentItem } from '@/features/fees/types';

export interface InitiatePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  selectedInstallment: PortalInstallmentItem | null;
  payAmount: number;
  onPayAmountChange: (amount: number) => void;
  onStartPayment: () => void;
  onSimulatePayment: () => void;
  isProcessing: boolean;
}

export const InitiatePaymentDialog: React.FC<InitiatePaymentDialogProps> = ({
  open,
  onClose,
  selectedInstallment,
  payAmount,
  onPayAmountChange,
  onStartPayment,
  onSimulatePayment,
  isProcessing,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Pay Fee Online</DialogTitle>
      <DialogContent dividers>
        {selectedInstallment && (
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {selectedInstallment.installment_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Due Date: {selectedInstallment.due_date}
            </Typography>

            <Alert severity="info" sx={{ my: 2 }}>
              Total Outstanding:{' '}
              <b>₹{Number(selectedInstallment.outstanding_amount).toLocaleString()}</b>
            </Alert>

            <TextField
              label="Payment Amount (₹)"
              type="number"
              required
              fullWidth
              value={payAmount}
              onChange={(e) =>
                onPayAmountChange(Math.max(0, parseFloat(e.target.value) || 0))
              }
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              helperText={`You can pay the full amount or a partial installment up to ₹${Number(
                selectedInstallment.outstanding_amount
              ).toLocaleString()}`}
              sx={{ mt: 1 }}
            />

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 2 }}
            >
              Secured by <b>Razorpay</b> (UPI, Credit/Debit Cards, NetBanking, Wallets).
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<PaymentIcon />}
          onClick={onStartPayment}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing Gateway...' : `Proceed to Pay ₹${payAmount.toLocaleString()}`}
        </Button>
        <Button
          fullWidth
          variant="text"
          color="secondary"
          size="small"
          onClick={onSimulatePayment}
          disabled={isProcessing}
        >
          ⚡ Quick Sandbox Verification (Simulate Success)
        </Button>
        <Button fullWidth onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

