'use client';

import React from 'react';
import { motion } from 'motion/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

export interface PulseLiveBadgeProps {
  label?: string;
  variant?: 'live' | 'invited' | 'scheduled' | 'completed' | 'danger';
  size?: 'small' | 'medium';
  pulse?: boolean;
}

export function PulseLiveBadge({
  label,
  variant = 'live',
  size = 'small',
  pulse = true,
}: PulseLiveBadgeProps) {
  const theme = useTheme();

  const config = {
    live: {
      color: theme.palette.error.main,
      bg: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      border: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.25)',
      defaultLabel: 'LIVE NOW',
    },
    invited: {
      color: theme.palette.primary.main,
      bg: theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
      border: theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.25)',
      defaultLabel: 'Invited',
    },
    scheduled: {
      color: theme.palette.info.main,
      bg: theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.1)',
      border: theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.3)' : 'rgba(14, 165, 233, 0.25)',
      defaultLabel: 'Scheduled',
    },
    completed: {
      color: theme.palette.text.secondary,
      bg: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      border: 'divider',
      defaultLabel: 'Completed',
    },
    danger: {
      color: theme.palette.error.main,
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.25)',
      defaultLabel: 'Warning',
    },
  }[variant];

  const displayText = label || config.defaultLabel;
  const isSmall = size === 'small';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.8,
        px: isSmall ? 1.1 : 1.5,
        py: isSmall ? 0.35 : 0.6,
        borderRadius: 9999,
        bgcolor: config.bg,
        border: '1px solid',
        borderColor: config.border,
        color: config.color,
      }}
    >
      {/* Radar Pulse Dot */}
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 8, height: 8 }}>
        {pulse && (
          <motion.div
            animate={{
              scale: [1, 2.2, 2.2],
              opacity: [0.75, 0, 0],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: config.color,
            }}
          />
        )}
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: config.color,
            boxShadow: `0 0 6px ${config.color}`,
          }}
        />
      </Box>

      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          fontSize: isSmall ? '0.7rem' : '0.8rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        {displayText}
      </Typography>
    </Box>
  );
}

export default PulseLiveBadge;
