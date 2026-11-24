'use client';

import React from 'react';
import { motion } from 'motion/react';
import Paper, { PaperProps } from '@mui/material/Paper';

export interface AnimatedCardProps extends PaperProps {
  children: React.ReactNode;
  liftOnHover?: boolean;
  glowOnHover?: boolean;
  glowColor?: string;
}

export default function AnimatedCard({
  children,
  liftOnHover = true,
  glowOnHover = false,
  glowColor,
  sx,
  ...paperProps
}: AnimatedCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color 0.15s ease',
        '&:hover': {
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? '#3f3f46' : '#cbd5e1',
        },
        ...sx,
      }}
      {...paperProps}
    >
      {children}
    </Paper>
  );
}
