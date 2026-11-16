'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Link from 'next/link';

interface TokenInvalidCardProps {
  message: string;
  actionHref: string;
  actionLabel: string;
}

export const TokenInvalidCard: React.FC<TokenInvalidCardProps> = ({
  message,
  actionHref,
  actionLabel,
}) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 440, textAlign: 'center', borderRadius: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {message}
        </Alert>
        <Button component={Link} href={actionHref} variant="contained">
          {actionLabel}
        </Button>
      </Paper>
    </Box>
  );
};

