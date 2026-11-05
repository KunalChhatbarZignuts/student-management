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
import CircularProgress from '@mui/material/CircularProgress';
import { StudentMark } from '../api';

interface MarksTableProps {
  marks?: StudentMark[];
  isLoading: boolean;
}

export const MarksTable: React.FC<MarksTableProps> = ({ marks, isLoading }) => {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Subject Name</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Course Code</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Max Score</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Obtained Score</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <CircularProgress size={28} sx={{ mr: 1, verticalAlign: 'middle' }} />
                Loading evaluation records...
              </TableCell>
            </TableRow>
          ) : !marks || marks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                No evaluation marks published for this term yet.
              </TableCell>
            </TableRow>
          ) : (
            marks.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.subject}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{row.code}</TableCell>
                <TableCell>{row.max_score}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{row.obtained_score}</TableCell>
                <TableCell>
                  <Chip
                    label={row.grade}
                    color={row.grade.startsWith('A') ? 'primary' : 'default'}
                    size="small"
                    sx={{ fontWeight: 700, minWidth: 42 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.status}
                    color={row.status === 'Pass' ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

