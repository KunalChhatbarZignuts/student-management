'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';

import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import GroupIcon from '@mui/icons-material/Group';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import StatusChip from '@/components/ui/StatusChip';
import EmptyState from '@/components/ui/EmptyState';
import { Section } from '@/features/grades/types';

export interface GradeSectionsTableProps {
  sections: Section[];
  onViewRoster: (section: Section) => void;
  onAssignTeacher: (section: Section) => void;
  onRemoveTeacher: (sectionId: string) => void;
  onEditSection: (section: Section) => void;
  onToggleStatus: (section: Section) => void;
}

export default function GradeSectionsTable({
  sections = [],
  onViewRoster,
  onAssignTeacher,
  onRemoveTeacher,
  onEditSection,
  onToggleStatus,
}: GradeSectionsTableProps) {
  return (
    <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Table>
        <TableHead sx={{ bgcolor: 'action.hover' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Section</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Class Teacher</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Capacity & Enrollment</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!sections || sections.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                <EmptyState
                  title="No sections configured"
                  description="No sections configured for this grade yet. Click Add Section to create one."
                />
              </TableCell>
            </TableRow>
          ) : (
            sections.map((section) => {
              const capacity = section.class_capacity || 30;
              const enrolled = section.total_students || 0;
              const percent = Math.min(Math.round((enrolled / capacity) * 100), 100);
              const isFull = enrolled >= capacity;

              return (
                <TableRow key={section.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                      {section.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={section.code || 'N/A'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {section.assigned_teacher_name ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {section.assigned_teacher_name}
                        </Typography>
                        <Tooltip title="Remove Assigned Class Teacher">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onRemoveTeacher(section.id)}
                          >
                            <PersonRemoveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PersonAddIcon />}
                        onClick={() => onAssignTeacher(section)}
                        sx={{ fontSize: '0.75rem', py: 0.25 }}
                      >
                        Assign Teacher
                      </Button>
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={600}>
                        {enrolled} / {capacity} Students
                      </Typography>
                      <Typography variant="caption" color={isFull ? 'error.main' : 'text.secondary'}>
                        {percent}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      color={isFull ? 'error' : percent > 80 ? 'warning' : 'primary'}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={section.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="View Student Roster">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => onViewRoster(section)}
                        >
                          <GroupIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Section Details">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => onEditSection(section)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={section.status === 'active' ? 'Deactivate Section' : 'Activate Section'}>
                        <IconButton
                          size="small"
                          color={section.status === 'active' ? 'error' : 'success'}
                          onClick={() => onToggleStatus(section)}
                        >
                          {section.status === 'active' ? (
                            <BlockIcon fontSize="small" />
                          ) : (
                            <CheckCircleIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

