import * as React from 'react';
import Chip, { ChipProps } from '@mui/material/Chip';

export interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, ...rest }) => {
  const normalized = status?.toUpperCase() || 'UNKNOWN';

  let color: 'success' | 'error' | 'warning' | 'info' | 'default' = 'default';

  if (
    normalized === 'PRESENT' ||
    normalized === 'PAID' ||
    normalized === 'APPROVED' ||
    normalized === 'ACTIVE' ||
    normalized === 'SUCCESS'
  ) {
    color = 'success';
  } else if (
    normalized === 'ABSENT' ||
    normalized === 'OVERDUE' ||
    normalized === 'REJECTED' ||
    normalized === 'CANCELLED' ||
    normalized === 'FAILED'
  ) {
    color = 'error';
  } else if (
    normalized === 'LATE' ||
    normalized === 'PENDING' ||
    normalized === 'PARTIAL' ||
    normalized === 'WARNING'
  ) {
    color = 'warning';
  } else if (
    normalized === 'EXCUSED' ||
    normalized === 'PROCESSING' ||
    normalized === 'INFO'
  ) {
    color = 'info';
  }

  return (
    <Chip
      size="small"
      label={normalized}
      color={color}
      sx={{ fontWeight: 600, fontSize: '0.75rem', ...rest.sx }}
      {...rest}
    />
  );
};

export default StatusChip;

