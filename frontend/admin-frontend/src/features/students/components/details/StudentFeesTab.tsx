'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';

import StatusChip from '@/components/ui/StatusChip';

export interface StudentFeesTabProps {
  feeInfo: any;
}

export default function StudentFeesTab({ feeInfo: fee }: StudentFeesTabProps) {
  if (!fee?.has_fee_assignment) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="info">No fee structures or fee assignments configured for this student.</Alert>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Financial Metric Cards */}
      <Grid item xs={12}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.default' }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={2.4}>
              <Typography variant="caption" color="text.secondary">Structure</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{fee.fee_structure_name}</Typography>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Typography variant="caption" color="text.secondary">Net Payable</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>${Number(fee.net_amount).toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Typography variant="caption" color="text.secondary">Total Paid</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>${Number(fee.paid_amount).toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Typography variant="caption" color="text.secondary">Outstanding Balance</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: Number(fee.outstanding_balance) > 0 ? 'error.main' : 'text.primary' }}>
                ${Number(fee.outstanding_balance).toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Typography variant="caption" color="text.secondary">Account Status</Typography>
              <Box sx={{ mt: 0.5 }}>
                <StatusChip status={fee.status?.toLowerCase() || 'active'} />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Installments Table */}
      <Grid item xs={12} md={7}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Installment Schedule</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Paid</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fee.installments?.map((inst: any) => (
                    <TableRow key={inst.id}>
                      <TableCell>{inst.installment_number}</TableCell>
                      <TableCell>{inst.due_date}</TableCell>
                      <TableCell>${Number(inst.amount).toFixed(2)}</TableCell>
                      <TableCell>${Number(inst.paid_amount).toFixed(2)}</TableCell>
                      <TableCell>${Number(inst.balance).toFixed(2)}</TableCell>
                      <TableCell>
                        <StatusChip status={inst.status?.toLowerCase()} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Payment Transactions */}
      <Grid item xs={12} md={5}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Payment History & Receipts</Typography>
            {fee.payments && fee.payments.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Receipt #</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fee.payments.map((pmt: any) => (
                      <TableRow key={pmt.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{pmt.receipt_number || '—'}</TableCell>
                        <TableCell>{new Date(pmt.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>{pmt.payment_method}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>
                          ${Number(pmt.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No payments recorded for this account yet.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

