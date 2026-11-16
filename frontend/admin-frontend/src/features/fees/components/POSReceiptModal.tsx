'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { POSPaymentReceiptResponse } from '../types/pos';
import { apiClient } from '@/lib/axios';

interface POSReceiptModalProps {
  open: boolean;
  receipt: POSPaymentReceiptResponse | null;
  onClose: () => void;
}

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  open,
  receipt,
  onClose,
}) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await apiClient.get(`/pos/receipts/${receipt.receipt_number}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt_${receipt.receipt_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Failed to download PDF receipt. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlineIcon color="success" />
          <Typography variant="h6" fontWeight={700}>
            Payment Recorded Successfully
          </Typography>
        </Box>
        <Chip
          label={receipt.payment_method}
          color="primary"
          size="small"
          sx={{ fontWeight: 700 }}
        />
      </DialogTitle>

      <DialogContent dividers>
        {/* Printable Receipt Paper Container */}
        <Box
          id="printable-receipt"
          sx={{
            p: 3,
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight={800} color="#0f172a" letterSpacing={0.5}>
              GREENWOOD INTERNATIONAL SCHOOL
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Affiliated with CBSE • Affiliation No. 1930482 • Academic Session 2026-2027
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              124 Campus Avenue, Academic District • Phone: +91 98765 43210
            </Typography>
            <Divider sx={{ my: 1.5, borderColor: '#2563eb', borderWidth: 1 }} />
            <Typography variant="subtitle1" fontWeight={700} color="#1e3a8a">
              OFFICIAL FEE PAYMENT RECEIPT
            </Typography>
          </Box>

          {/* Metadata Cards */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                RECEIPT NUMBER
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {receipt.receipt_number}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                PAYMENT DATE
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {receipt.payment_date}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                STUDENT NAME
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {receipt.student_name}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                ADMISSION NO
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {receipt.admission_number}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                GRADE & SECTION
              </Typography>
              <Typography variant="body2">
                {receipt.grade_name} - {receipt.section_name}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                RECEIVED BY / CASHIER
              </Typography>
              <Typography variant="body2">
                {receipt.cashier_name}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                REFERENCE / REMARKS
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {receipt.transaction_reference || receipt.remarks || 'Counter collection'}
              </Typography>
            </Grid>
          </Grid>

          {/* Allocation Table */}
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', mb: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#1e3a8a' }}>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Installment / Particulars</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Due Date</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'right' }}>Prior Balance</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'right' }}>Amount Paid</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'right' }}>New Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receipt.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 600 }}>{item.installment_title}</TableCell>
                    <TableCell>{item.due_date}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>₹{Number(item.prior_outstanding).toLocaleString()}</TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: 'success.main' }}>
                      ₹{Number(item.amount_paid).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>₹{Number(item.new_outstanding).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, textAlign: 'right' }}>
                    TOTAL RECEIVED:
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: 'primary.main', fontSize: '1rem' }}>
                    ₹{Number(receipt.amount_paid).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>
                    ₹{Number(receipt.total_remaining_balance).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Tendered Breakdown (Cash) */}
          {receipt.cash_tendered !== null && receipt.cash_tendered !== undefined && (
            <Box
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 1.5,
                bgcolor: '#fef3c7',
                border: '1px solid #fde68a',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2">
                <b>Cash Tendered:</b> ₹{Number(receipt.cash_tendered).toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <b>Change Returned:</b> ₹{Number(receipt.change_returned || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="success.dark">
                <b>Net Settled:</b> ₹{Number(receipt.amount_paid).toLocaleString()}
              </Typography>
            </Box>
          )}

          {/* Outstanding Notice */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: receipt.total_remaining_balance > 0 ? '#fffbeb' : '#f0fdf4',
              border: '1px solid',
              borderColor: receipt.total_remaining_balance > 0 ? '#fde68a' : '#bbf7d0',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color={receipt.total_remaining_balance > 0 ? 'warning.dark' : 'success.dark'} fontWeight={600}>
              {receipt.total_remaining_balance > 0
                ? `Note: Remaining unpaid balance of ₹${Number(receipt.total_remaining_balance).toLocaleString()} is due for this student across academic terms.`
                : 'All dues for active installments have been fully cleared. Thank you!'}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">
          Close Window
        </Button>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print Slip
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleDownloadPdf}
          >
            Download PDF
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

