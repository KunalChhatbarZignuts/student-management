'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';

import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';

import StatusChip from '@/components/ui/StatusChip';

export interface StudentsTableProps {
  items: any[];
  total: number;
  loading: boolean;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  onView: (studentId: string) => void;
  onEdit: (student: any) => void;
  onResendInvite: (userId: string, userName: string) => void;
  onToggleStatus: (actionType: 'suspend' | 'activate', userId: string, userName: string) => void;
  onPasswordReset: (userId: string, userName: string) => void;
}

export default function StudentsTable({
  items,
  total,
  loading,
  paginationModel,
  onPaginationModelChange,
  onView,
  onEdit,
  onResendInvite,
  onToggleStatus,
  onPasswordReset,
}: StudentsTableProps) {
  const columns: GridColDef[] = React.useMemo(
    () => [
      {
        field: 'enrollment_number',
        headerName: 'Enrollment No.',
        width: 170,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={700} color="primary.main">
            {params.row.student?.enrollment_number || params.row.student?.student_code || 'Pending'}
          </Typography>
        ),
      },
      {
        field: 'student_code',
        headerName: 'Student ID',
        width: 150,
        renderCell: (params) => (
          <Typography variant="body2" color="text.secondary">
            {params.row.student?.student_code || 'Pending'}
          </Typography>
        ),
      },
      {
        field: 'name',
        headerName: 'Student Name',
        width: 180,
        valueGetter: (_, row) =>
          row.student ? `${row.student.first_name} ${row.student.last_name}` : row.email,
      },
      {
        field: 'email',
        headerName: 'Account Email',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'class',
        headerName: 'Class / Sec',
        width: 130,
        valueGetter: (_, row) =>
          row.student ? `${row.student.class_name} (${row.student.section})` : '-',
      },
      {
        field: 'department',
        headerName: 'Department',
        width: 130,
        valueGetter: (_, row) => row.student?.department || '-',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: (params) => <StatusChip status={params.row.status} />,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 220,
        sortable: false,
        renderCell: (params) => {
          const u = params.row;
          const studentName = u.student
            ? `${u.student.first_name} ${u.student.last_name}`
            : u.email;

          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {u.student && (
                <>
                  <Tooltip title="View Comprehensive Details">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => onView(u.student.id)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Edit Student & Enrollment">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => onEdit(u.student)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              {u.status === 'invited' && (
                <Tooltip title="Resend Activation Invite">
                  <IconButton
                    size="small"
                    color="warning"
                    onClick={() => onResendInvite(u.id, studentName)}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {u.status === 'active' ? (
                <Tooltip title="Suspend Account">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onToggleStatus('suspend', u.id, studentName)}
                  >
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Activate Account">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => onToggleStatus('activate', u.id, studentName)}
                  >
                    <CheckCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Trigger Password Reset">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onPasswordReset(u.id, studentName)}
                >
                  <LockResetIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [onView, onEdit, onResendInvite, onToggleStatus, onPasswordReset]
  );

  return (
    <Paper sx={{ height: 520, width: '100%', borderRadius: 3 }} elevation={0} variant="outlined">
      <DataGrid
        rows={items}
        columns={columns}
        loading={loading}
        paginationMode="server"
        rowCount={total}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        pageSizeOptions={[10, 20, 50]}
        disableRowSelectionOnClick
        sx={{ border: 0 }}
      />
    </Paper>
  );
}

