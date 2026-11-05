'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

export const AttendancePolicyNotice: React.FC = () => {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <EventAvailableIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Attendance Policy Notice
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        A minimum threshold of 85% attendance across registered courses is required for regular term completion.
        Discrepancies should be submitted through your department head.
      </Typography>
    </Paper>
  );
};

