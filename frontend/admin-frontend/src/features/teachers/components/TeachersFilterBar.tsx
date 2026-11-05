'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import SearchFilterBar from '@/components/ui/SearchFilterBar';

export interface TeachersFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export default function TeachersFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: TeachersFilterBarProps) {
  return (
    <SearchFilterBar
      search={search}
      onSearchChange={onSearchChange}
      placeholder="Search by instructor email or name..."
      searchGridProps={{ xs: 12, sm: 6, md: 4 }}
    >
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          select
          fullWidth
          size="small"
          label="Status Filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          <MenuItem value="">All Statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="invited">Invited</MenuItem>
          <MenuItem value="suspended">Suspended</MenuItem>
          <MenuItem value="deactivated">Deactivated</MenuItem>
        </TextField>
      </Grid>
    </SearchFilterBar>
  );
}

