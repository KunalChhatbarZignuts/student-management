import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { FeeReceiptDetail } from '@/features/fees/types';

export interface FeeReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  receiptDetail?: FeeReceiptDetail | null;
  isLoading: boolean;
}

export const FeeReceiptDialog: React.FC<FeeReceiptDialogProps> = ({
  open,
  onClose,
  receiptDetail,
  isLoading,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Official Fee Payment Receipt</span>
        <Box>
          <IconButton onClick={() => window.print()} title="Print Receipt">
            <PrintIcon />
          </IconButton>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading || !receiptDetail ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, bgcolor: '#fafafa' }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight={800} color="primary.main">
                STUDENT MANAGEMENT ACADEMY
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Official Fee Payment Receipt & Acknowledgment
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 1 }}>
                {receiptDetail.receipt_number}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Date: {receiptDetail.payment_date} • Mode:{' '}
                {receiptDetail.payment_method.toUpperCase()}
              </Typography>
            </Box>

            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Student Name
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {receiptDetail.student_name}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Enrollment / Code
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {receiptDetail.enrollment_number || receiptDetail.student_code || '—'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Grade / Class
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {receiptDetail.grade_name || '—'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Academic Year
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {receiptDetail.academic_year_name || '—'}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Installment Description:</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {receiptDetail.installment_name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Installment Total:</Typography>
                <Typography variant="body2">
                  ₹{Number(receiptDetail.installment_total_amount).toLocaleString()}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                  color: 'success.main',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Amount Settled:
                </Typography>
                <Typography variant="subtitle1" fontWeight={700}>
                  ₹{Number(receiptDetail.amount).toLocaleString()}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'text.secondary',
                }}
              >
                <Typography variant="body2">Remaining Outstanding:</Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{Number(receiptDetail.installment_outstanding_amount).toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {receiptDetail.reference_note && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Note / Ref:
                </Typography>
                <Typography variant="body2">{receiptDetail.reference_note}</Typography>
              </Box>
            )}

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed #ccc', textAlign: 'center' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'success.main',
                  mb: 0.5,
                }}
              >
                <CheckCircleOutlineIcon fontSize="small" />
                <Typography variant="caption" fontWeight={700}>
                  PAYMENT VERIFIED
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                This is an official computer-generated receipt, valid without physical signature.
              </Typography>
            </Box>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
          Print Receipt
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

