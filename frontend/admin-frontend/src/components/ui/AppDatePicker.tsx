'use client';

import * as React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';

export interface AppDatePickerProps {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  disabled?: boolean;
  maxDate?: Dayjs | string;
  minDate?: Dayjs | string;
  sx?: any;
}

export default function AppDatePicker({
  label,
  value,
  onChange,
  required = false,
  error = false,
  helperText,
  size,
  fullWidth = true,
  disabled = false,
  maxDate,
  minDate,
  sx,
}: AppDatePickerProps) {
  const parsedValue = value && dayjs(value).isValid() ? dayjs(value) : null;

  return (
    <DatePicker
      label={label}
      value={parsedValue}
      disabled={disabled}
      onChange={(newValue: Dayjs | null) => {
        onChange(newValue && newValue.isValid() ? newValue.format('YYYY-MM-DD') : '');
      }}
      maxDate={maxDate ? (dayjs.isDayjs(maxDate) ? maxDate : dayjs(maxDate)) : undefined}
      minDate={minDate ? (dayjs.isDayjs(minDate) ? minDate : dayjs(minDate)) : undefined}
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

