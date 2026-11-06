'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import AddTaskIcon from '@mui/icons-material/AddTask';
import { UnassignedStudentItem } from '../types';

interface UnassignedStudentsTableProps {
  students: UnassignedStudentItem[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onOpenBulkEnroll: () => void;
  isLoading?: boolean;
}

export default function UnassignedStudentsTable({
  students,
  selectedIds,
  onSelect,
  onOpenBulkEnroll,
  isLoading,
}: UnassignedStudentsTableProps) {
  const allSelected = students.length > 0 && selectedIds.length === students.length;

  const handleToggleAll = () => {
    if (allSelected) {
      onSelect([]);
    } else {
      onSelect(students.map((s) => s.student_id));
    }
  };

  const handleToggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((item) => item !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell padding="checkbox">
                <Checkbox disabled size="small" />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Enrollment No</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Target Grade</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Target Section</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Admission Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3].map((row) => (
              <TableRow key={row}>
                <TableCell padding="checkbox">
                  <Skeleton variant="rounded" width={18} height={18} />
                </TableCell>
                <TableCell><Skeleton width={110} height={20} /></TableCell>
                <TableCell><Skeleton width={140} height={20} /></TableCell>
                <TableCell><Skeleton width={80} height={20} /></TableCell>
                <TableCell><Skeleton width={60} height={20} /></TableCell>
                <TableCell><Skeleton width={90} height={20} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (students.length === 0) {
    return (
      <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No unassigned students pending enrollment. All admitted students have active class assignments!
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Admitted Students Awaiting Class Assignment ({students.length})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select students to batch assign them to a grade and section.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddTaskIcon />}
          disabled={selectedIds.length === 0}
          onClick={onOpenBulkEnroll}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          Bulk Assign Section ({selectedIds.length})
        </Button>
      </Box>

      <TableContainer sx={{ maxHeight: 420 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < students.length}
                  checked={allSelected}
                  onChange={handleToggleAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Student Code</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Enrollment #</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Admission Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((st) => {
              const isSelected = selectedIds.includes(st.student_id);
              return (
                <TableRow
                  key={st.student_id}
                  hover
                  selected={isSelected}
                  onClick={() => handleToggleOne(st.student_id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={isSelected} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{st.student_code}</TableCell>
                  <TableCell>{st.enrollment_number || '—'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {st.first_name} {st.last_name}
                  </TableCell>
                  <TableCell>{st.department}</TableCell>
                  <TableCell>{st.admission_date}</TableCell>
                  <TableCell>
                    <Chip label="Unassigned" color="warning" size="small" sx={{ fontWeight: 600 }} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

