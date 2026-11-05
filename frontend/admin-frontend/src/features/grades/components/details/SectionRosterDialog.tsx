'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

import StatusChip from '@/components/ui/StatusChip';
import EmptyState from '@/components/ui/EmptyState';
import { Section, EnrolledStudentItem } from '@/features/grades/types';

export interface SectionRosterDialogProps {
  section: Section | null;
  onClose: () => void;
  rosterData: { total_students: number; items: EnrolledStudentItem[] } | null | undefined;
  isLoading: boolean;
  onTransferStudent: (student: EnrolledStudentItem) => void;
}

export default function SectionRosterDialog({
  section,
  onClose,
  rosterData,
  isLoading,
  onTransferStudent,
}: SectionRosterDialogProps) {
  if (!section) return null;

  return (
    <Dialog
      open={Boolean(section)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle fontWeight={700}>
        Enrolled Students - Section {section.name} ({rosterData?.total_students || 0} Students)
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !rosterData?.items || rosterData.items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <EmptyState
              title="No enrolled students"
              description="No active students enrolled in this section."
            />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Roll No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Student Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Enrollment Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rosterData.items.map((student) => (
                  <TableRow key={student.enrollment_id} hover>
                    <TableCell>{student.roll_no}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary.main">
                        {student.student_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {student.first_name} {student.last_name}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={student.status?.toLowerCase()} />
                    </TableCell>
                    <TableCell>{student.enrollment_date}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Transfer Student to Another Section">
                        <Button
                          size="small"
                          startIcon={<SwapHorizIcon />}
                          onClick={() => onTransferStudent(student)}
                        >
                          Transfer
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

