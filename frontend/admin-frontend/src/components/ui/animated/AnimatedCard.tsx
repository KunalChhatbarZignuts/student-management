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
    <motion.div
      whileHover={liftOnHover ? { y: -3, scale: 1.008 } : {}}
      whileTap={liftOnHover ? { scale: 0.995 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ height: '100%', width: '100%' }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
          '&:hover': {
            borderColor: glowColor || 'primary.main',
            boxShadow: glowOnHover
              ? `0 8px 24px ${glowColor ? `${glowColor}30` : 'rgba(99, 102, 241, 0.15)'}`
              : (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 6px 20px rgba(0,0,0,0.4)'
                    : '0 6px 20px rgba(0,0,0,0.06)',
          },
          ...sx,
        }}
        {...paperProps}
      >
        {children}
      </Paper>
    </motion.div>
  );
}
