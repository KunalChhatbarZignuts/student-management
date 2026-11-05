import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { AuditLogItem } from '@/features/audit-logs/api';

export interface AuditLogTableProps {
  isLoading: boolean;
  logs: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  isLoading,
  logs,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actor</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Action Event</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Target Entity</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Entity ID</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <CircularProgress size={28} sx={{ mr: 1, verticalAlign: 'middle' }} />
                Loading live audit trail...
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                No matching audit log records found in database.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{row.actor_email || 'System'}</TableCell>
                <TableCell>
                  <Chip
                    label={row.action}
                    size="small"
                    color={
                      row.action.includes('suspended') || row.action.includes('failure')
                        ? 'error'
                        : row.action.includes('created') || row.action.includes('approved')
                        ? 'success'
                        : 'primary'
                    }
                  />
                </TableCell>
                <TableCell>{row.entity_type}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {row.entity_id || '-'}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {row.ip || '127.0.0.1'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={total}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        onRowsPerPageChange={(e) => {
          onPageSizeChange(parseInt(e.target.value, 10));
        }}
      />
    </TableContainer>
  );
};

