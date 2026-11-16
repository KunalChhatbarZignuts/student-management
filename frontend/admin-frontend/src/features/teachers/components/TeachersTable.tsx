'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';

import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockResetIcon from '@mui/icons-material/LockReset';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';

import StatusChip from '@/components/ui/StatusChip';

export interface TeachersTableProps {
  items: any[];
  total: number;
  loading: boolean;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  onView: (teacherId: string) => void;
  onViewProfile: (teacherId: string) => void;
  onAssignSubject: (teacherId: string) => void;
  onResendInvite: (userId: string, userName: string) => void;
  onToggleStatus: (actionType: 'suspend' | 'activate', userId: string, userName: string) => void;
  onPasswordReset: (userId: string, userName: string) => void;
  onDeactivate: (teacher: { id: string; name: string; employee_code?: string }) => void;
}

export default function TeachersTable({
  items,
  total,
  loading,
  paginationModel,
  onPaginationModelChange,
  onView,
  onViewProfile,
  onAssignSubject,
  onResendInvite,
  onToggleStatus,
  onPasswordReset,
  onDeactivate,
}: TeachersTableProps) {
  const columns: GridColDef[] = React.useMemo(
    () => [
      {
        field: 'employee_code',
        headerName: 'Employee Code',
        width: 160,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={700} color="primary.main">
            {params.row.teacher?.employee_code || 'Pending'}
          </Typography>
        ),
      },
      {
        field: 'name',
        headerName: 'Teacher Name',
        width: 190,
        valueGetter: (_, row) =>
          row.teacher ? `${row.teacher.first_name} ${row.teacher.last_name}` : row.email,
      },
      {
        field: 'email',
        headerName: 'Email Address',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'department',
        headerName: 'Department',
        width: 150,
        valueGetter: (_, row) => row.teacher?.department || '-',
      },
      {
        field: 'phone',
        headerName: 'Contact Phone',
        width: 140,
        valueGetter: (_, row) => row.teacher?.phone || '-',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: (params) => <StatusChip status={params.row.status} />,
      },
      {
        field: 'actions',
        headerName: 'Row Actions',
        width: 290,
        sortable: false,
        renderCell: (params) => {
          const u = params.row;
          const teacherName = u.teacher
            ? `${u.teacher.first_name} ${u.teacher.last_name}`
            : u.email;

          return (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {u.teacher && (
                <>
                  <Tooltip title="View Comprehensive Details">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => onView(u.teacher.id)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="View Profile & Subjects">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => onViewProfile(u.teacher.id)}
                    >
                      <AccountCircleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Assign Subject(s)">
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => onAssignSubject(u.teacher.id)}
                    >
                      <MenuBookIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              {u.status === 'invited' && (
                <Tooltip title="Resend Invite">
                  <IconButton
                    size="small"
                    color="warning"
                    onClick={() => onResendInvite(u.id, teacherName)}
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
                    onClick={() => onToggleStatus('suspend', u.id, teacherName)}
                  >
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Activate Account">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => onToggleStatus('activate', u.id, teacherName)}
                  >
                    <CheckCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Trigger Password Reset">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onPasswordReset(u.id, teacherName)}
                >
                  <LockResetIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {u.teacher && (
                <Tooltip title="Deactivate Faculty & Assignments">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      onDeactivate({
                        id: u.teacher.id,
                        name: teacherName,
                        employee_code: u.teacher.employee_code,
                      })
                    }
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        },
      },
    ],
    [onView, onViewProfile, onAssignSubject, onResendInvite, onToggleStatus, onPasswordReset, onDeactivate]
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

