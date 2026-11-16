'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { SxProps, Theme } from '@mui/material/styles';

export interface SearchFilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
  searchGridProps?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  sx?: SxProps<Theme>;
}

export default function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = 'Search...',
  children,
  searchGridProps = { xs: 12, sm: 4, md: 4 },
  sx,
}: SearchFilterBarProps) {
  const showSearch = onSearchChange !== undefined;

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 2,
        borderColor: 'divider',
        ...sx,
      }}
    >
      <Grid container spacing={2} alignItems="center">
        {showSearch && (
          <Grid item {...searchGridProps}>
            <TextField
              fullWidth
              size="small"
              placeholder={placeholder}
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="clear search"
                      onClick={() => onSearchChange('')}
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Grid>
        )}
        {children}
      </Grid>
    </Paper>
  );
}

