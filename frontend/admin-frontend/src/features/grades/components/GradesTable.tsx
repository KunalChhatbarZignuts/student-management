'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';

import StatusChip from '@/components/ui/StatusChip';
import EmptyState from '@/components/ui/EmptyState';
import { Grade } from '@/features/grades/types';

export interface GradesTableProps {
  grades: Grade[];
  total: number;
  page: number;
  rowsPerPage: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRows: number) => void;
  onRowClick: (gradeId: string) => void;
  onEdit: (grade: Grade) => void;
  onToggleStatus: (grade: Grade) => void;
}

export default function GradesTable({
  grades,
  total,
  page,
  rowsPerPage,
  isLoading,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
  onEdit,
  onToggleStatus,
}: GradesTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Table>
        <TableHead sx={{ bgcolor: 'action.hover' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Grade Name</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Level</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Academic Year</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Coordinator Teacher</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="center">
              Sections
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="center">
              Enrolled Students
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                <CircularProgress size={36} />
              </TableCell>
            </TableRow>
          ) : grades.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ p: 0 }}>
                <EmptyState
                  icon={<SchoolIcon />}
                  title="No grades found"
                  description="No grades matching the selected search criteria or filters."
                  py={6}
                />
              </TableCell>
            </TableRow>
          ) : (
            grades.map((grade) => (
              <TableRow
                key={grade.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onRowClick(grade.id)}
              >
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                    {grade.name}
                  </Typography>
                  {grade.description && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {grade.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={grade.code || 'N/A'} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{grade.level}</TableCell>
                <TableCell>{grade.academic_year_name || '-'}</TableCell>
                <TableCell>
                  {grade.coordinator_name ? (
                    <Typography variant="body2" fontWeight={500}>
                      {grade.coordinator_name}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Not assigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={grade.total_sections}
                    color={grade.total_sections > 0 ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={grade.total_students}
                    color={grade.total_students > 0 ? 'info' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <StatusChip status={grade.status} />
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="View Sections & Details">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => onRowClick(grade.id)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Grade">
                    <IconButton size="small" onClick={() => onEdit(grade)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={grade.status === 'active' ? 'Deactivate Grade' : 'Activate Grade'}>
                    <IconButton
                      size="small"
                      color={grade.status === 'active' ? 'warning' : 'success'}
                      onClick={() => onToggleStatus(grade)}
                    >
                      {grade.status === 'active' ? (
                        <BlockIcon fontSize="small" />
                      ) : (
                        <CheckCircleIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
      />
    </TableContainer>
  );
}

