'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
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
import CircularProgress from '@mui/material/CircularProgress';

import AddIcon from '@mui/icons-material/Add';

import { AcademicYear } from '@/features/grades/types';
import { FeeStructureListItem } from '@/features/fees/api';

export interface FeeStructuresTabProps {
  selectedYearId: string;
  onYearChange: (val: string) => void;
  academicYears: AcademicYear[];
  structures: FeeStructureListItem[];
  isLoading: boolean;
  onOpenCreateStructure: () => void;
}

export default function FeeStructuresTab({
  selectedYearId,
  onYearChange,
  academicYears,
  structures,
  isLoading,
  onOpenCreateStructure,
}: FeeStructuresTabProps) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Academic Year</InputLabel>
            <Select
              label="Academic Year"
              value={selectedYearId}
              onChange={(e) => onYearChange(e.target.value)}
            >
              {academicYears.map((ay) => (
                <MenuItem key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? ' (Current)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Button variant="contained" startIcon={<AddIcon />} onClick={onOpenCreateStructure}>
          Configure Grade Fee Structure
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Structure Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Academic Year</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Base Amount (Mandatory)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Components</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Effective Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : structures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No fee structures configured for this session. Click &quot;Configure Grade Fee Structure&quot; to create one.
                </TableCell>
              </TableRow>
            ) : (
              structures.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                  <TableCell>{s.grade_name || 'N/A'}</TableCell>
                  <TableCell>{s.academic_year_name || 'N/A'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    ₹{Number(s.total_amount).toLocaleString()}
                  </TableCell>
                  <TableCell>{s.items_count} components</TableCell>
                  <TableCell>{s.effective_date}</TableCell>
                  <TableCell>
                    <Chip
                      label={s.status}
                      size="small"
                      color={s.status === 'active' ? 'success' : 'default'}
                    />
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

