'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { TimetableDetail } from '../types';

interface LegacyScheduleViewProps {
  schedule?: TimetableDetail['schedule'];
}

export const LegacyScheduleView: React.FC<LegacyScheduleViewProps> = ({ schedule }) => {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
      <Table>
        <TableHead sx={{ bgcolor: 'grey.100' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Schedule</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {schedule?.map((item, index) => (
            <TableRow key={index}>
              <TableCell sx={{ fontWeight: 600 }}>{item.subject}</TableCell>
              <TableCell>
                <Chip label={item.subject_code} size="small" />
              </TableCell>
              <TableCell>{item.teacher}</TableCell>
              <TableCell>{item.schedule}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

