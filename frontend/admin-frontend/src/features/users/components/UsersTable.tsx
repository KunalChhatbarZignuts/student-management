'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';

import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LockResetIcon from '@mui/icons-material/LockReset';

import StatusChip from '@/components/ui/StatusChip';

export interface UsersTableProps {
  items: any[];
  total: number;
  loading: boolean;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  onToggleStatus: (actionType: 'suspend' | 'activate', userId: string, userName: string) => void;
  onPasswordReset: (userId: string, userName: string) => void;
}

export default function UsersTable({
  items,
  total,
  loading,
  paginationModel,
  onPaginationModelChange,
  onToggleStatus,
  onPasswordReset,
}: UsersTableProps) {
  const columns: GridColDef[] = React.useMemo(
    () => [
      {
        field: 'email',
        headerName: 'Email Address',
        flex: 1,
        minWidth: 220,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={600}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'role',
        headerName: 'System Role',
        width: 160,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={
              params.value === 'SUPER_ADMIN'
                ? 'error'
                : params.value === 'ADMIN'
                ? 'primary'
                : 'default'
            }
            size="small"
          />
        ),
      },
      {
        field: 'status',
        headerName: 'Account Status',
        width: 140,
        renderCell: (params) => <StatusChip status={params.value} />,
      },
      {
        field: 'created_at',
        headerName: 'Created Date',
        width: 180,
        valueGetter: (_, row) => new Date(row.created_at).toLocaleDateString(),
      },
      {
        field: 'actions',
        headerName: 'Status Actions',
        width: 150,
        sortable: false,
        renderCell: (params) => {
          const u = params.row;
          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {u.status === 'active' ? (
                <Tooltip title="Suspend Account">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onToggleStatus('suspend', u.id, u.email)}
                  >
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Activate Account">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => onToggleStatus('activate', u.id, u.email)}
                  >
                    <CheckCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Trigger Password Reset">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onPasswordReset(u.id, u.email)}
                >
                  <LockResetIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [onToggleStatus, onPasswordReset]
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

