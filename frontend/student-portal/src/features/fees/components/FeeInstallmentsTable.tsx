import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptIcon from '@mui/icons-material/Receipt';

import { StatusChip } from '@/components/ui/StatusChip';
import { PortalInstallmentItem } from '@/features/fees/types';

export interface FeeInstallmentsTableProps {
  installments: PortalInstallmentItem[];
  onPayNow: (installment: PortalInstallmentItem) => void;
  onViewReceipt: (receiptNumber: string) => void;
}

export const FeeInstallmentsTable: React.FC<FeeInstallmentsTableProps> = ({
  installments,
  onPayNow,
  onViewReceipt,
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Installment Breakdown & Online Payment
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Installment</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Paid
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">
                Outstanding
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {installments.map((inst) => (
              <TableRow key={inst.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{inst.installment_name}</TableCell>
                <TableCell>{inst.due_date}</TableCell>
                <TableCell align="right">₹{Number(inst.amount).toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                  ₹{Number(inst.paid_amount).toLocaleString()}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 700,
                    color:
                      Number(inst.outstanding_amount) > 0 ? 'warning.main' : 'text.secondary',
                  }}
                >
                  ₹{Number(inst.outstanding_amount).toLocaleString()}
                </TableCell>
                <TableCell>
                  <StatusChip status={inst.status} />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    {/* Pay Now Button */}
                    {Number(inst.outstanding_amount) > 0 && (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<PaymentIcon />}
                        onClick={() => onPayNow(inst)}
                      >
                        Pay Now
                      </Button>
                    )}

                    {/* View Receipt Button */}
                    {inst.receipt_numbers && inst.receipt_numbers.length > 0 && (
                      <Tooltip title={`Receipt: ${inst.receipt_numbers[0]}`}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ReceiptIcon />}
                          onClick={() => onViewReceipt(inst.receipt_numbers[0])}
                        >
                          Receipt
                        </Button>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

