'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import { FeeInvoice } from '@/features/academic/api';

interface ChildFeesTabProps {
  fees?: FeeInvoice[] | null;
  isLoading: boolean;
}

export const ChildFeesTab: React.FC<ChildFeesTabProps> = ({ fees, isLoading }) => {
  const totalFees = React.useMemo(() => {
    return (fees || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [fees]);

  const paidFees = React.useMemo(() => {
    return (fees || [])
      .filter((f) => f.status.toLowerCase() === 'paid')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [fees]);

  const pendingFees = totalFees - paidFees;

  if (isLoading) {
    return <Skeleton variant="rounded" height={220} />;
  }

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">TOTAL ASSESSED FEES</Typography>
              <Typography variant="h4" fontWeight={700}>
                ${totalFees.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">PAID AMOUNT</Typography>
              <Typography variant="h4" fontWeight={700} color="success.main">
                ${paidFees.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">OUTSTANDING BALANCE</Typography>
              <Typography variant="h4" fontWeight={700} color={pendingFees > 0 ? 'error.main' : 'text.primary'}>
                ${pendingFees.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Invoice & Payment History
        </Typography>
        {!fees || fees.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No fee invoices registered for this student.
          </Typography>
        ) : (
          <TableContainer sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fees.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{inv.invoice_number}</TableCell>
                    <TableCell>{inv.description}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      ${inv.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{inv.due_date}</TableCell>
                    <TableCell>
                      <Chip
                        label={inv.status}
                        size="small"
                        color={inv.status === 'Paid' ? 'success' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
