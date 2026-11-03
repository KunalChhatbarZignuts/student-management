'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export default function Loading() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 160px)',
        py: 8,
        gap: 2,
      }}
    >
      <CircularProgress color="primary" size={40} thickness={4} />
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        Loading...
      </Typography>
    </Box>
  );
}
