'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

interface AuthCardWrapperProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  maxWidth?: number;
  children: React.ReactNode;
}

export const AuthCardWrapper: React.FC<AuthCardWrapperProps> = ({
  title,
  subtitle,
  icon,
  maxWidth = 460,
  children,
}) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 4 },
          width: '100%',
          maxWidth,
          borderRadius: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {icon && (
            <Box
              sx={{
                display: 'inline-flex',
                p: 1.5,
                borderRadius: 3,
                bgcolor: 'primary.light',
                color: 'primary.dark',
                mb: 1.5,
              }}
            >
              {icon}
            </Box>
          )}
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        {children}
      </Paper>
    </Box>
  );
};

