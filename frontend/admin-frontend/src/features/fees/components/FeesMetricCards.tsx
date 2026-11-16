'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { FeeDashboardMetrics } from '@/features/fees/api';

export interface FeesMetricCardsProps {
  metrics?: FeeDashboardMetrics;
  isLoading: boolean;
}

export default function FeesMetricCards({ metrics, isLoading }: FeesMetricCardsProps) {
  return (
    <Grid container spacing={2.5} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              TOTAL ASSIGNED FEES
            </Typography>
            {isLoading ? (
              <CircularProgress size={24} sx={{ my: 1 }} />
            ) : (
              <Typography variant="h4" fontWeight={700} color="primary.main">
                ₹{Number(metrics?.total_assigned_fees ?? 0).toLocaleString()}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Across {metrics?.total_student_assignments ?? 0} active student enrollments
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'warning.main' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              OUTSTANDING BALANCE
            </Typography>
            {isLoading ? (
              <CircularProgress size={24} sx={{ my: 1 }} />
            ) : (
              <Typography variant="h4" fontWeight={700} color="warning.main">
                ₹{Number(metrics?.total_outstanding_fees ?? 0).toLocaleString()}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Remaining across pending installments
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'success.main' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              COLLECTED FEES
            </Typography>
            {isLoading ? (
              <CircularProgress size={24} sx={{ my: 1 }} />
            ) : (
              <Typography variant="h4" fontWeight={700} color="success.main">
                ₹{Number(metrics?.total_collected_fees ?? 0).toLocaleString()}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Settled fee installment receipts
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'info.main' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              ACTIVE STRUCTURES
            </Typography>
            {isLoading ? (
              <CircularProgress size={24} sx={{ my: 1 }} />
            ) : (
              <Typography variant="h4" fontWeight={700} color="info.main">
                {metrics?.total_active_structures ?? 0}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Grade fee plans in active session
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

