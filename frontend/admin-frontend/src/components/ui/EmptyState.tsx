'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { SxProps, Theme } from '@mui/material/styles';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  py?: number;
  sx?: SxProps<Theme>;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  py = 6,
  sx,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        py,
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        ...sx,
      }}
      role="status"
      aria-label={title}
    >
      {icon && (
        <Box
          sx={{
            color: 'text.secondary',
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': { fontSize: 48 },
          }}
        >
          {icon}
        </Box>
      )}

      <Typography variant="subtitle1" fontWeight={600} color="text.primary" gutterBottom>
        {title}
      </Typography>

      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mb: action ? 2.5 : 0 }}>
          {description}
        </Typography>
      )}

      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}

