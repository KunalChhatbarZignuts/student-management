'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import SchoolIcon from '@mui/icons-material/School';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BlockIcon from '@mui/icons-material/Block';
import { EnrollmentDashboardMetrics } from '../types';

interface EnrollmentDashboardCardsProps {
  metrics: EnrollmentDashboardMetrics;
}

export default function EnrollmentDashboardCards({ metrics }: EnrollmentDashboardCardsProps) {
  const cards = [
    {
      label: 'Active Enrolled',
      value: metrics.total_enrolled,
      icon: <SchoolIcon sx={{ color: 'primary.main', fontSize: 32 }} />,
      color: '#EBF3FF',
    },
    {
      label: 'Unassigned Students',
      value: metrics.unassigned_students,
      icon: <PersonOffIcon sx={{ color: 'warning.main', fontSize: 32 }} />,
      color: '#FFF8E1',
    },
    {
      label: 'Transferred Students',
      value: metrics.transferred_students,
      icon: <SwapHorizIcon sx={{ color: 'info.main', fontSize: 32 }} />,
      color: '#E0F2FE',
    },
    {
      label: 'Promoted Students',
      value: metrics.promoted_students,
      icon: <TrendingUpIcon sx={{ color: 'success.main', fontSize: 32 }} />,
      color: '#E8F5E9',
    },
    {
      label: 'Inactive / Left',
      value: metrics.inactive_students,
      icon: <BlockIcon sx={{ color: 'text.secondary', fontSize: 32 }} />,
      color: '#F3F4F6',
    },
  ];

  return (
    <Grid container spacing={2.5}>
      {cards.map((c, i) => (
        <Grid item xs={12} sm={6} md={2.4} key={i}>
          <Card elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {c.label}
                </Typography>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: c.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {c.icon}
                </Box>
              </Box>
              <Typography variant="h4" fontWeight={700}>
                {c.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

