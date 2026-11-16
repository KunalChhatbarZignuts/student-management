'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export interface LeaveMonitoringStatsProps {
  total: number;
  pending: number;
  approved: number;
  unassigned: number;
}

export default function LeaveMonitoringStats({
  total,
  pending,
  approved,
  unassigned,
}: LeaveMonitoringStatsProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ borderRadius: 2, border: 1, borderColor: 'divider', boxShadow: 0 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Total Applications
            </Typography>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              {total}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ borderRadius: 2, border: 1, borderColor: 'warning.light', bgcolor: 'warning.50', boxShadow: 0 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="caption" color="warning.dark" fontWeight={600} textTransform="uppercase">
              Pending Review
            </Typography>
            <Typography variant="h4" fontWeight={700} color="warning.dark">
              {pending}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ borderRadius: 2, border: 1, borderColor: 'success.light', bgcolor: 'success.50', boxShadow: 0 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="caption" color="success.dark" fontWeight={600} textTransform="uppercase">
              Approved Leaves
            </Typography>
            <Typography variant="h4" fontWeight={700} color="success.dark">
              {approved}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ borderRadius: 2, border: 1, borderColor: unassigned > 0 ? 'error.light' : 'divider', bgcolor: unassigned > 0 ? 'error.50' : 'background.paper', boxShadow: 0 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="caption" color={unassigned > 0 ? 'error.dark' : 'text.secondary'} fontWeight={600} textTransform="uppercase">
              Attention Required
            </Typography>
            <Typography variant="h4" fontWeight={700} color={unassigned > 0 ? 'error.dark' : 'text.primary'}>
              {unassigned}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

