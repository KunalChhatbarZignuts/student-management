'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export interface AttendanceCounters {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export interface AttendanceSummaryCardsProps {
  counters: AttendanceCounters;
}

export function AttendanceSummaryCards({ counters }: AttendanceSummaryCardsProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={6} sm={4} md={2}>
        <Card sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary">
              Total Students
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {counters.total}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <Card sx={{ borderRadius: 2, bgcolor: 'success.50' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="success.dark">
              Present
            </Typography>
            <Typography variant="h5" fontWeight={700} color="success.main">
              {counters.present}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <Card sx={{ borderRadius: 2, bgcolor: 'error.50' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="error.dark">
              Absent
            </Typography>
            <Typography variant="h5" fontWeight={700} color="error.main">
              {counters.absent}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <Card sx={{ borderRadius: 2, bgcolor: 'warning.50' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="warning.dark">
              Late
            </Typography>
            <Typography variant="h5" fontWeight={700} color="warning.main">
              {counters.late}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <Card sx={{ borderRadius: 2, bgcolor: 'info.50' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="info.dark">
              Excused
            </Typography>
            <Typography variant="h5" fontWeight={700} color="info.main">
              {counters.excused}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={4} md={2}>
        <Card sx={{ borderRadius: 2, bgcolor: 'primary.50' }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="primary.dark">
              Attendance Rate
            </Typography>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              {counters.percentage}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
