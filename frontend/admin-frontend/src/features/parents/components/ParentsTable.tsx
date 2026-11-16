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
import EditIcon from '@mui/icons-material/Edit';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import LinkIcon from '@mui/icons-material/Link';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';

import StatusChip from '@/components/ui/StatusChip';
import { ParentWithChildren } from '@/features/parents/api';

export interface ParentsTableProps {
  items: ParentWithChildren[];
  total: number;
  loading: boolean;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  onView: (parent: ParentWithChildren) => void;
  onEdit: (parent: ParentWithChildren) => void;
  onLink: (parent: ParentWithChildren) => void;
  onResendInvite: (targetId: string, targetName: string) => void;
  onToggleStatus: (actionType: 'suspend' | 'activate', targetId: string, targetName: string) => void;
}

export default function ParentsTable({
  items,
  total,
  loading,
  paginationModel,
  onPaginationModelChange,
  onView,
  onEdit,
  onLink,
  onResendInvite,
  onToggleStatus,
}: ParentsTableProps) {
  const columns: GridColDef[] = React.useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Parent / Guardian',
        width: 200,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FamilyRestroomIcon color="primary" fontSize="small" />
            <Typography variant="body2" fontWeight={600}>
              {params.row.first_name} {params.row.last_name}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'email',
        headerName: 'Email Address',
        flex: 1,
        minWidth: 210,
      },
      {
        field: 'phone',
        headerName: 'Phone Number',
        width: 150,
        valueGetter: (_, row) => row.phone || '-',
      },
      {
        field: 'children_count',
        headerName: 'Linked Children',
        width: 140,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Chip
            label={`${params.row.children_count || params.row.children?.length || 0} Children`}
            size="small"
            color={params.row.children_count > 0 ? 'primary' : 'default'}
            variant={params.row.children_count > 0 ? 'filled' : 'outlined'}
          />
        ),
      },
      {
        field: 'user_status',
        headerName: 'Account Status',
        width: 130,
        renderCell: (params) => <StatusChip status={params.row.user_status || 'invited'} />,
      },
      {
        field: 'created_at',
        headerName: 'Joined Date',
        width: 130,
        valueGetter: (_, row) =>
          row.created_at ? new Date(row.created_at).toLocaleDateString() : '-',
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 230,
        sortable: false,
        renderCell: (params) => {
          const p: ParentWithChildren = params.row;
          const pName = `${p.first_name} ${p.last_name}`;

          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="View Details & Children">
                <IconButton size="small" color="info" onClick={() => onView(p)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Edit Parent Profile">
                <IconButton size="small" color="primary" onClick={() => onEdit(p)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Link a Student">
                <IconButton size="small" color="secondary" onClick={() => onLink(p)}>
                  <LinkIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {p.user_status === 'invited' && (
                <Tooltip title="Resend Activation Invite">
                  <IconButton
                    size="small"
                    color="warning"
                    onClick={() => onResendInvite(p.id, pName)}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {p.user_status === 'active' ? (
                <Tooltip title="Suspend Account">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onToggleStatus('suspend', p.id, pName)}
                  >
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Activate Account">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => onToggleStatus('activate', p.id, pName)}
                  >
                    <CheckCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        },
      },
    ],
    [onView, onEdit, onLink, onResendInvite, onToggleStatus]
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

