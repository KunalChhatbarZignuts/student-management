'use client';

import React from 'react';
import { motion } from 'motion/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

export interface SpringPillProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  size?: 'small' | 'medium';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
}

export default function SpringPill({
  label,
  selected = false,
  onClick,
  icon,
  disabled = false,
  size = 'small',
  color = 'primary',
}: SpringPillProps) {
  const theme = useTheme();
  const isSmall = size === 'small';

  const themeColor = theme.palette[color] || theme.palette.primary;

  return (
    <Box
      component="button"
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: isSmall ? 1.4 : 2,
        py: isSmall ? 0.45 : 0.75,
        borderRadius: 9999,
        border: '1px solid',
        borderColor: selected ? themeColor.main : 'divider',
        bgcolor: selected
          ? themeColor.main
          : theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.04)'
          : 'rgba(0, 0, 0, 0.02)',
        color: selected
          ? themeColor.contrastText
          : theme.palette.text.primary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        userSelect: 'none',
        transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
        boxShadow: 'none',
        '&:hover': {
          bgcolor: selected
            ? themeColor.dark
            : theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.05)',
          borderColor: selected ? themeColor.dark : themeColor.main,
        },
      }}
    >
      {icon && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            fontSize: isSmall ? '0.9rem' : '1.1rem',
            color: selected ? 'inherit' : themeColor.main,
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        variant="caption"
        sx={{
          fontWeight: selected ? 700 : 500,
          fontSize: isSmall ? '0.75rem' : '0.85rem',
          lineHeight: 1.4,
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
