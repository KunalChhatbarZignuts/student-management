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
import CircularProgress from '@mui/material/CircularProgress';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import EventNoteIcon from '@mui/icons-material/EventNote';

import { LeaveApplicationItem } from '../types';

interface LeaveApplicationsTableProps {
  applications?: LeaveApplicationItem[];
  isLoading: boolean;
}

export const LeaveApplicationsTable: React.FC<LeaveApplicationsTableProps> = ({
  applications,
  isLoading,
}) => {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Table>
        <TableHead sx={{ bgcolor: 'grey.50' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Requested Dates</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Assigned Class Teacher</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Teacher Remarks</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <CircularProgress size={32} />
              </TableCell>
            </TableRow>
          ) : !applications || applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                <EventNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1">No leave applications recorded.</Typography>
                <Typography variant="caption" color="text.secondary">
                  Click &quot;Apply for Leave&quot; above to submit a new request.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            applications.map((item) => {
              const isPending = item.status === 'pending';
              const isApproved = item.status === 'approved';
              const isRejected = item.status === 'rejected';

              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {item.start_date} to {item.end_date}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Submitted: {new Date(item.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${item.days_count} ${item.days_count === 1 ? 'day' : 'days'}`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography variant="body2">{item.reason}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="primary.main">
                      {item.class_teacher_name || 'Pending Assignment'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {isPending && (
                      <Chip
                        icon={<HourglassEmptyIcon />}
                        label="Pending Review"
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
                  <TableCell sx={{ maxWidth: 260 }}>
                    {item.teacher_remarks ? (
                      <Typography variant="body2">{item.teacher_remarks}</Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {isPending ? 'Awaiting teacher decision' : 'No remarks'}
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
};

