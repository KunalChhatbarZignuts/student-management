'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { AcademicYear, Grade } from '@/features/grades/types';
import { PaginatedFeeAssignmentsResponse } from '@/features/fees/api';

export interface StudentFeesTabProps {
  assignmentSearch: string;
  onSearchChange: (val: string) => void;
  selectedYearId: string;
  onYearChange: (val: string) => void;
  academicYears: AcademicYear[];
  selectedGradeId: string;
  onGradeChange: (val: string) => void;
  grades: Grade[];
  assignmentsData?: PaginatedFeeAssignmentsResponse;
  isLoading: boolean;
  onViewAssignment: (id: string) => void;
}

export default function StudentFeesTab({
  assignmentSearch,
  onSearchChange,
  selectedYearId,
  onYearChange,
  academicYears,
  selectedGradeId,
  onGradeChange,
  grades,
  assignmentsData,
  isLoading,
  onViewAssignment,
}: StudentFeesTabProps) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search student name or enrollment..."
          value={assignmentSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 300 } }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Academic Year</InputLabel>
          <Select
            label="Academic Year"
            value={selectedYearId}
            onChange={(e) => onYearChange(e.target.value)}
          >
            <MenuItem value="">All Academic Years</MenuItem>
            {academicYears.map((ay) => (
              <MenuItem key={ay.id} value={ay.id}>
                {ay.name} {ay.is_current ? ' (Current)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Grade</InputLabel>
          <Select
            label="Grade"
            value={selectedGradeId}
            onChange={(e) => onGradeChange(e.target.value)}
          >
            <MenuItem value="">All Grades</MenuItem>
            {grades.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Enrollment No</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Base Fee</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Discounts</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Charges</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Final Payable</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Installments</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : !assignmentsData?.items || assignmentsData.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No student fee assignments found.
                </TableCell>
              </TableRow>
            ) : (
              assignmentsData.items.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.student_name}</TableCell>
                  <TableCell>
                    <code>{row.enrollment_number || row.student_code}</code>
                  </TableCell>
                  <TableCell>{row.grade_name}</TableCell>
                  <TableCell align="right">₹{Number(row.base_amount).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}>
                    -₹{Number(row.total_discount).toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'error.main' }}>
                    +₹{Number(row.total_additional).toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    ₹{Number(row.final_payable_amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip label={`${row.installments_count} parts`} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Fee Breakdown & Schedule">
                      <IconButton size="small" color="primary" onClick={() => onViewAssignment(row.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

