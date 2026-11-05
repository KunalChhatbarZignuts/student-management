'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';

import PersonIcon from '@mui/icons-material/Person';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

import EmptyState from '@/components/ui/EmptyState';
import { LeaveApplicationItem } from '@/features/leaves/types';

export interface LeaveRequestsTableProps {
  items: LeaveApplicationItem[];
  isLoading: boolean;
  onApprove: (item: LeaveApplicationItem) => void;
  onReject: (item: LeaveApplicationItem) => void;
}

export default function LeaveRequestsTable({
  items,
  isLoading,
  onApprove,
  onReject,
}: LeaveRequestsTableProps) {
  return (
    <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Table>
        <TableHead sx={{ bgcolor: 'action.hover' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Class / Section</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Leave Period</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Submitted By</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <CircularProgress size={32} />
              </TableCell>
            </TableRow>
          ) : !items || items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <EmptyState
                  title="No leave requests"
                  description="No leave requests found for this status tab."
                />
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const isPending = item.status === 'pending';
              const isApproved = item.status === 'approved';
              const isRejected = item.status === 'rejected';

              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {item.student_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.enrollment_number || item.student_code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {item.grade_name || '-'} {item.section_name ? `(${item.section_name})` : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.start_date} to {item.end_date}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Applied: {new Date(item.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${item.days_count} ${item.days_count === 1 ? 'day' : 'days'}`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={item.submission_role === 'parent' ? <FamilyRestroomIcon /> : <PersonIcon />}
                      label={item.submission_role === 'parent' ? 'Parent' : 'Student'}
                      size="small"
                      color={item.submission_role === 'parent' ? 'secondary' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap title={item.reason}>
                      {item.reason}
                    </Typography>
                    {item.teacher_remarks && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>Remarks:</strong> {item.teacher_remarks}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {isPending && (
                      <Chip
                        icon={<HourglassEmptyIcon />}
                        label="Pending"
                        size="small"
                        color="warning"
                      />
                    )}
                    {isApproved && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Approved"
                        size="small"
                        color="success"
                      />
                    )}
                    {isRejected && (
                      <Chip
                        icon={<CancelIcon />}
                        label="Rejected"
                        size="small"
                        color="error"
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {isPending ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => onApprove(item)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => onReject(item)}
                        >
                          Reject
                        </Button>
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {item.decided_at
                          ? `Decided ${new Date(item.decided_at).toLocaleDateString()}`
                          : '-'}
                      </Typography>
                    )}
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

