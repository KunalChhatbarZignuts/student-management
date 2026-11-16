'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

interface DashboardGreetingHeaderProps {
  name: string;
  role: string;
  isStudent: boolean;
}

export const DashboardGreetingHeader: React.FC<DashboardGreetingHeaderProps> = ({
  name,
  role,
  isStudent,
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Welcome back, {name}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isStudent
              ? 'Access your academic records, attendance summary, and class updates.'
              : 'Monitor your children’s educational progress, attendance, and fee notices.'}
          </Typography>
        </Box>
        <Chip
          label={`Logged in as ${role}`}
          color="primary"
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      </Box>
    </Box>
  );
};

