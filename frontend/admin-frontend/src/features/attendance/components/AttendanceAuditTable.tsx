import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { AttendanceAuditItemResponse } from '@/features/attendance/types';

export interface AttendanceAuditTableProps {
  loadingAudits: boolean;
  auditLogs?: AttendanceAuditItemResponse[];
  filteredAuditLogs: AttendanceAuditItemResponse[];
  searchAuditQuery: string;
  onSearchAuditQueryChange: (query: string) => void;
  onViewStudentHistory: (studentId: string) => void;
}

export const AttendanceAuditTable: React.FC<AttendanceAuditTableProps> = ({
  loadingAudits,
  auditLogs,
  filteredAuditLogs,
  searchAuditQuery,
  onSearchAuditQueryChange,
  onViewStudentHistory,
}) => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Attendance Audit Trail
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Immutable record of all corrections made to attendance records, including the previous
          status, new status, modifier, and mandatory reason.
        </Typography>
      </Box>

      {loadingAudits ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !auditLogs || auditLogs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary">
            No attendance corrections recorded in the audit trail yet.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
            <TextField
              size="small"
              placeholder="Search audit trail by student, reason, or admin..."
              value={searchAuditQuery}
              onChange={(e) => onSearchAuditQueryChange(e.target.value)}
              sx={{ maxWidth: 450, width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell>
                    <strong>Timestamp</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Student</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Previous</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Corrected To</strong>
                  </TableCell>
                  <TableCell width="35%">
                    <strong>Mandatory Reason</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Modified By</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Student History</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAuditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No audit logs match the search query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontSize: '0.85rem' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {log.student_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.enrollment_number || ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={log.previous_status} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={log.new_status}
                          size="small"
                          color={
                            log.new_status === 'PRESENT'
                              ? 'success'
                              : log.new_status === 'ABSENT'
                              ? 'error'
                              : 'info'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{log.reason}</Typography>
                      </TableCell>
                      <TableCell>{log.modified_by_name || 'Admin'}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Student Attendance History">
                          <IconButton
                            size="small"
                            onClick={() => onViewStudentHistory(log.student_id)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

