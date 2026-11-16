'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
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
import { StudentMark } from '@/features/academic/api';

interface ChildMarksTabProps {
  marks?: StudentMark[] | null;
  isLoading: boolean;
}

export const ChildMarksTab: React.FC<ChildMarksTabProps> = ({ marks, isLoading }) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Academic Evaluation & Examination Marks
      </Typography>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : !marks || marks.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No examination marks published for this student yet.
        </Typography>
      ) : (
        <TableContainer sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Subject Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Max Marks</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Obtained Marks</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Percentage</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Grade</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Term</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {marks.map((m) => {
                const pct = m.max_score > 0 ? Math.round((m.obtained_score / m.max_score) * 100) : 0;
                return (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{m.subject}</TableCell>
                    <TableCell>{m.code}</TableCell>
                    <TableCell align="right">{m.max_score}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {m.obtained_score}
                    </TableCell>
                    <TableCell align="center">{pct}%</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={m.grade}
                        size="small"
                        color={m.grade.startsWith('A') ? 'success' : m.grade.startsWith('B') ? 'primary' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>{m.term}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};
