'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';

interface FeeInvoice {
  invoiceNumber: string;
  description: string;
  dueDate: string;
  amount: string;
  status: 'Paid' | 'Pending';
}

// Ready to connect to backend endpoint when available
async function fetchFeeInvoices(): Promise<FeeInvoice[]> {
  return [
    {
      invoiceNumber: 'INV-2026-001',
      description: 'Term 1 Tuition & Laboratory Fee',
      dueDate: '2026-09-15',
      amount: '$1,250.00',
      status: 'Paid',
    },
    {
      invoiceNumber: 'INV-2026-002',
      description: 'Term 2 Tuition & Facilities',
      dueDate: '2027-01-15',
      amount: '$1,250.00',
      status: 'Pending',
    },
  ];
}

export default function FeesPage() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['financial', 'fees'],
    queryFn: fetchFeeInvoices,
  });

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 920, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Fee Accounts & Invoices
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review current billing schedules, tuition dues, and payment records.
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    TOTAL PAID THIS YEAR
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    $1,250.00
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    OUTSTANDING BALANCE
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    $1,250.00
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Loading fee records...
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices?.map((inv) => (
                    <TableRow key={inv.invoiceNumber}>
                      <TableCell sx={{ fontWeight: 600 }}>{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.description}</TableCell>
                      <TableCell>{inv.dueDate}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{inv.amount}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={inv.status}
                          color={inv.status === 'Paid' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
