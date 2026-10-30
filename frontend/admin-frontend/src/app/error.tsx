'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log unexpected errors securely without sensitive tokens
    console.error('Unhandled app error:', error.message);
  }, [error]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            width: '100%',
          }}
        >
          <Typography variant="h4" color="error.main" fontWeight={700}>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary">
            An unexpected error occurred while loading this page.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="contained" color="primary" onClick={() => reset()}>
              Try again
            </Button>
            <Button variant="outlined" onClick={() => (window.location.href = '/')}>
              Go to Home
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
