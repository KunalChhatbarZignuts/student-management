'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import { AttendanceRecord } from '@/features/academic/api';

interface AttendanceLogTableProps {
  records: AttendanceRecord[];
}

export const AttendanceLogTable: React.FC<AttendanceLogTableProps> = ({ records }) => {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Presence Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Remarks & Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                No attendance roll call entries recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            records.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={r.status.toUpperCase()}
                    size="small"
                    color={
                      r.status === 'present'
                        ? 'success'
                        : r.status === 'excused'
                        ? 'warning'
                        : 'error'
                    }
                  />
                </TableCell>
                <TableCell>{r.notes || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

