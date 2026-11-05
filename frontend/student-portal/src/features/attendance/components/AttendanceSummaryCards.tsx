'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

interface AttendanceSummaryCardsProps {
  percentage: number;
  attended: number;
  total: number;
  excused: number;
}

export const AttendanceSummaryCards: React.FC<AttendanceSummaryCardsProps> = ({
  percentage,
  attended,
  total,
  excused,
}) => {
  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              OVERALL ATTENDANCE RATE
            </Typography>
            <Typography
              variant="h4"
              fontWeight={700}
              color={percentage >= 85 ? 'success.main' : 'error.main'}
            >
              {percentage}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentage, 100)}
              color={percentage >= 85 ? 'success' : 'error'}
              sx={{ height: 8, borderRadius: 4, mt: 1.5 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              CLASSES ATTENDED
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {attended} / {total}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Term 1 (2026-2027)
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={4}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              EXCUSED ABSENCES
            </Typography>
            <Typography variant="h4" fontWeight={700} color="secondary.main">
              {excused}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Approved medical or official leave
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

