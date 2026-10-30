'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Link from 'next/link';

export default function NotFound() {
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
          <Typography variant="h2" color="primary.main" fontWeight={800}>
            404
          </Typography>
          <Typography variant="h5" fontWeight={600}>
            Page Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The page you are looking for does not exist or has been moved.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button
              component={Link}
              href="/"
              variant="contained"
              color="primary"
            >
              Back to Dashboard
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
