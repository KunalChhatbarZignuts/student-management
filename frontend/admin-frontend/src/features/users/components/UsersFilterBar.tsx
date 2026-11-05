'use client';

import * as React from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import SearchFilterBar from '@/components/ui/SearchFilterBar';
import { ROLES } from '@/lib/constants';

export interface UsersFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export default function UsersFilterBar({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
}: UsersFilterBarProps) {
  return (
    <SearchFilterBar
      search={search}
      onSearchChange={onSearchChange}
      placeholder="Search by email..."
      searchGridProps={{ xs: 12, sm: 6, md: 4 }}
    >
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          select
          fullWidth
          size="small"
          label="Role Filter"
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
        >
          <MenuItem value="">All Roles</MenuItem>
          {Object.values(ROLES).map((role) => (
            <MenuItem key={role} value={role}>
              {role}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
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
        </TextField>
      </Grid>
    </SearchFilterBar>
  );
}

