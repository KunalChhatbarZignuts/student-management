'use client';

import * as React from 'react';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { Dayjs } from 'dayjs';

export interface AppTimePickerProps {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  disabled?: boolean;
  sx?: any;
}

export default function AppTimePicker({
  label,
  value,
  onChange,
  required = false,
  error = false,
  helperText,
  size = 'small',
  fullWidth = true,
  disabled = false,
  sx,
}: AppTimePickerProps) {
  const parsedValue: Dayjs | null = React.useMemo(() => {
    if (!value) return null;
    // value is "HH:mm" or "HH:mm:ss"
    const parts = value.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        return dayjs().hour(h).minute(m).second(0);
      }
    }
    const d = dayjs(value);
    return d.isValid() ? d : null;
  }, [value]);

  return (
    <TimePicker
      label={label}
      value={parsedValue}
      disabled={disabled}
      onChange={(newValue: Dayjs | null) => {
        if (newValue && newValue.isValid()) {
          onChange(newValue.format('HH:mm'));
        } else {
          onChange('');
        }
      }}
      sx={sx}
      slotProps={{
        textField: {
          size,
          fullWidth,
          required,
          error,
          helperText,
        },
      }}
    />
  );
}

