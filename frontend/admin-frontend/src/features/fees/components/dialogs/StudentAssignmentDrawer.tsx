'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import PaymentIcon from '@mui/icons-material/Payment';

import { StudentFeeAssignment, FeeInstallmentItem } from '@/features/fees/api';

export interface StudentAssignmentDrawerProps {
  open: boolean;
  onClose: () => void;
  assignmentDetail?: StudentFeeAssignment;
  isLoading: boolean;
  onOpenAdjustmentDialog: () => void;
  onOpenOfflinePaymentDialog: (installment: FeeInstallmentItem) => void;
}

export default function StudentAssignmentDrawer({
  open,
  onClose,
  assignmentDetail,
  isLoading,
  onOpenAdjustmentDialog,
  onOpenOfflinePaymentDialog,
}: StudentAssignmentDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 550 }, p: 3 } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Student Fee Assignment Detail
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {isLoading || !assignmentDetail ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {assignmentDetail.student_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enrollment: <code>{assignmentDetail.enrollment_number || assignmentDetail.student_code}</code>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Grade: {assignmentDetail.grade_name} • Academic Year: {assignmentDetail.academic_year_name}
            </Typography>
          </Paper>

          {/* Financial Summary */}
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Fee Summary
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Base Configured Fee:</Typography>
              <Typography variant="body2" fontWeight={600}>₹{Number(assignmentDetail.base_amount).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'success.main' }}>
              <Typography variant="body2">Total Discounts & Concessions:</Typography>
              <Typography variant="body2" fontWeight={600}>-₹{Number(assignmentDetail.total_discount).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'error.main' }}>
              <Typography variant="body2">Additional Charges:</Typography>
              <Typography variant="body2" fontWeight={600}>+₹{Number(assignmentDetail.total_additional).toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight={700}>Final Payable Amount:</Typography>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                ₹{Number(assignmentDetail.final_payable_amount).toLocaleString()}
              </Typography>
            </Box>
          </Paper>

          {/* Adjustments List */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Individual Adjustments ({assignmentDetail.adjustments?.length || 0})
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon fontSize="small" />}
              onClick={onOpenAdjustmentDialog}
            >
              Add Concession / Charge
            </Button>
          </Box>

          {assignmentDetail.adjustments && assignmentDetail.adjustments.length > 0 ? (
            <Box sx={{ mb: 3 }}>
              {assignmentDetail.adjustments.map((adj) => (
                <Paper key={adj.id} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={600}>
                      {adj.description}
                    </Typography>
                    <Chip
                      label={adj.category === 'additional_charge' ? `+₹${adj.amount}` : `-₹${adj.amount}`}
                      size="small"
                      color={adj.category === 'additional_charge' ? 'error' : 'success'}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Type: {adj.adjustment_type} {adj.rate ? `(${adj.rate}%)` : ''}
                  </Typography>
                </Paper>
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
              No individual concessions or additional charges applied.
            </Typography>
          )}

          {/* Installment Schedule */}
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Installment Schedule
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell>Installment</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignmentDetail.installments.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{inst.installment_name}</TableCell>
                    <TableCell>{inst.due_date}</TableCell>
                    <TableCell align="right">₹{Number(inst.amount).toLocaleString()}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 600,
                        color: Number(inst.outstanding_amount) > 0 ? 'warning.main' : 'success.main',
                      }}
                    >
                      ₹{Number(inst.outstanding_amount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={inst.status}
                        size="small"
                        color={inst.status === 'paid' ? 'success' : inst.status === 'pending' ? 'default' : 'warning'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {Number(inst.outstanding_amount) > 0 && (
                        <Tooltip title="Record Offline Payment (Cash, Cheque, Bank Transfer)">
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<PaymentIcon fontSize="small" />}
                            onClick={() => onOpenOfflinePaymentDialog(inst)}
                            sx={{ py: 0.25, fontSize: '0.75rem' }}
                          >
                            Record Pay
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Drawer>
  );
}

