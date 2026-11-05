'use client';

import * as React from 'react';
import Chip, { ChipProps } from '@mui/material/Chip';
import { SxProps, Theme } from '@mui/material/styles';

export type StatusColorType = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const STATUS_COLOR_MAP: Record<string, StatusColorType> = {
  active: 'success',
  approved: 'success',
  present: 'success',
  completed: 'success',
  paid: 'success',
  published: 'success',

  pending: 'warning',
  draft: 'warning',
  late: 'warning',
  partially_paid: 'warning',
  in_progress: 'warning',

  inactive: 'default',
  rejected: 'error',
  suspended: 'error',
  locked: 'error',
  absent: 'error',
  cancelled: 'default',
  failed: 'error',

  enrolled: 'info',
  transferred: 'info',
  excused: 'info',
};

export interface StatusChipProps {
  status?: string | null;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  sx?: SxProps<Theme>;
  customLabel?: string;
}

export default function StatusChip({
  status,
  size = 'small',
  variant = 'filled',
  sx,
  customLabel,
}: StatusChipProps) {
  if (!status) return null;

  const normalized = status.toLowerCase().trim();
  const color = STATUS_COLOR_MAP[normalized] || 'default';
  const label = customLabel || status.toUpperCase();

  return (
    <Chip
      label={label}
      size={size}
      variant={variant}
      color={color}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.725rem' : '0.8125rem',
        ...sx,
      }}
    />
  );
}

