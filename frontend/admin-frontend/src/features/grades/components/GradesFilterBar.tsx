'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';

import { AcademicYear } from '@/features/grades/types';

export interface GradesFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  academicYearId: string;
  onAcademicYearChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  academicYears: AcademicYear[];
}

export default function GradesFilterBar({
  search,
  onSearchChange,
  academicYearId,
  onAcademicYearChange,
  statusFilter,
  onStatusFilterChange,
  academicYears,
}: GradesFilterBarProps) {
  return (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }} elevation={0} variant="outlined">
      <Grid container spacing={2} alignItems="center">
        {/* Search Field */}
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search grades by name or code..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        {/* Academic Year Selector */}
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            size="small"
            select
            label="Academic Year"
            value={academicYearId}
            onChange={(e) => onAcademicYearChange(e.target.value)}
          >
            <MenuItem value="">
              <em>All Years</em>
            </MenuItem>
            {academicYears.map((year) => (
              <MenuItem key={year.id} value={year.id}>
                {year.name} {year.is_current ? '(Current)' : ''}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Status Filter */}
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            size="small"
            select
            label="Status Filter"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="active">Active Only</MenuItem>
            <MenuItem value="inactive">Inactive Only</MenuItem>
          </TextField>
        </Grid>
      </Grid>
    </Paper>
  );
}

