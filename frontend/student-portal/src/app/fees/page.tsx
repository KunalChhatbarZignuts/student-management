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
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useQuery } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { useMyChildren } from '@/features/parents/hooks';
import { academicApi } from '@/features/academic/api';

export default function FeesPage() {
  const { role } = useAuth();
  const isParent = role === ROLES.PARENT;

  const { data: children } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const selectedChild = children && children.length > 0 ? children[selectedChildIndex] : null;

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['financial', 'fees', isParent ? selectedChild?.id : 'me'],
    queryFn: () => {
      if (isParent) {
        if (!selectedChild?.id) return [];
        return academicApi.getChildFees(selectedChild.id);
      }
      return academicApi.getMyFees();
    },
    enabled: isParent ? Boolean(selectedChild?.id) : true,
  });

  const totalFees = (invoices || []).reduce((acc, inv) => acc + inv.amount, 0);
  const paidFees = (invoices || [])
    .filter((inv) => inv.status === 'Paid')
    .reduce((acc, inv) => acc + inv.amount, 0);
  const outstandingFees = totalFees - paidFees;

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Fees & Tuition Invoices
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review current billing status, term tuition fees, and past payment receipts.
            </Typography>
          </Box>

          {isParent && children && children.length > 1 && (
            <Tabs
              value={selectedChildIndex}
              onChange={(_, val) => setSelectedChildIndex(val)}
              sx={{ mb: 3 }}
            >
              {children.map((child, idx) => (
                <Tab key={child.id} label={`${child.first_name} ${child.last_name}`} />
              ))}
            </Tabs>
          )}

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    TOTAL ASSESSED FEES
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    ${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Academic Year 2026-2027
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    SETTLED & PAID
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    ${paidFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Confirmed by accounts office
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    OUTSTANDING BALANCE
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color={outstandingFees > 0 ? 'warning.main' : 'success.main'}
                  >
                    ${outstandingFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {outstandingFees > 0 ? 'Due for upcoming term' : 'All accounts settled'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Invoice Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Payment Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Loading fee invoices...
                    </TableCell>
                  </TableRow>
                ) : !invoices || invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      No billing invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell>{inv.description}</TableCell>
                      <TableCell>{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
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
