'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LockResetIcon from '@mui/icons-material/LockReset';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';
import { adminUserApi, userKeys } from '@/features/users/api';
import { adminStudentApi } from '@/features/students/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

const createAdminSchema = z.object({
  email: z.string().email('Valid email is required').trim().toLowerCase(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

type CreateAdminFormData = z.infer<typeof createAdminSchema>;

export default function UsersManagementPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'suspend' | 'activate' | 'password-reset';
    userId: string;
    userName: string;
  } | null>(null);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const queryParams = {
    skip: paginationModel.page * paginationModel.pageSize,
    limit: paginationModel.pageSize,
    search: debouncedSearch || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: userKeys.list(queryParams),
    queryFn: () => adminUserApi.listAllUsers(queryParams),
    placeholderData: keepPreviousData,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isCreating },
  } = useForm<CreateAdminFormData>({
    resolver: zodResolver(createAdminSchema),
  });

  const createAdminMutation = useMutation({
    mutationFn: (payload: CreateAdminFormData) => adminUserApi.createAdmin(payload),
    onSuccess: () => {
      showSnackbar('Administrator account created and invitation dispatched!', 'success');
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      setOpenCreateDialog(false);
      reset();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to create admin user'), 'error');
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ type, userId }: { type: string; userId: string }) => {
      if (type === 'suspend') return adminStudentApi.suspendUser(userId);
      if (type === 'activate') return adminStudentApi.activateUser(userId);
      if (type === 'password-reset') return adminStudentApi.triggerPasswordReset(userId);
    },
    onSuccess: (_, vars) => {
      showSnackbar(`User action "${vars.type}" performed successfully!`, 'success');
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      setConfirmAction(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to perform user action'), 'error');
    },
  });

  const columns: GridColDef[] = [
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
      renderCell: (params) => (
        <Chip
          label={params.value.toUpperCase()}
          color={params.value === 'active' ? 'success' : 'warning'}
          size="small"
        />
      ),
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
                  onClick={() =>
                    setConfirmAction({
                      type: 'suspend',
                      userId: u.id,
                      userName: u.email,
                    })
                  }
                >
                  <BlockIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Activate Account">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() =>
                    setConfirmAction({
                      type: 'activate',
                      userId: u.id,
                      userName: u.email,
                    })
                  }
                >
                  <CheckCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Trigger Password Reset">
              <IconButton
                size="small"
                color="primary"
                onClick={() =>
                  setConfirmAction({
                    type: 'password-reset',
                    userId: u.id,
                    userName: u.email,
                  })
                }
              >
                <LockResetIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Master Account Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Super Admin Control: Oversee all system accounts and provision administrative staff.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => setOpenCreateDialog(true)}
          >
            Create Administrator
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search account email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filter by Role"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPaginationModel((prev) => ({ ...prev, page: 0 }));
                }}
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="super_admin">SUPER_ADMIN</MenuItem>
                <MenuItem value="admin">ADMIN</MenuItem>
                <MenuItem value="teacher">TEACHER</MenuItem>
                <MenuItem value="student">STUDENT</MenuItem>
                <MenuItem value="parent">PARENT</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filter by Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPaginationModel((prev) => ({ ...prev, page: 0 }));
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="invited">Invited</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ height: 520, width: '100%', borderRadius: 3 }}>
          <DataGrid
            rows={data?.items || []}
            columns={columns}
            loading={isLoading}
            paginationMode="server"
            rowCount={data?.total || 0}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            sx={{ border: 0 }}
          />
        </Paper>

        {/* Create Admin Dialog */}
        <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>Provision Admin Account</DialogTitle>
          <Box component="form" onSubmit={handleSubmit((d) => createAdminMutation.mutate(d))} noValidate>
            <DialogContent dividers>
              <TextField
                margin="normal"
                fullWidth
                label="Admin Email Address"
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email')}
              />
              <TextField
                margin="normal"
                fullWidth
                label="First Name (Optional)"
                {...register('first_name')}
              />
              <TextField
                margin="normal"
                fullWidth
                label="Last Name (Optional)"
                {...register('last_name')}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setOpenCreateDialog(false)} color="inherit">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isCreating}
                startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {isCreating ? 'Provisioning...' : 'Provision Admin'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>

        {confirmAction && (
          <ConfirmDialog
            open={Boolean(confirmAction)}
            title={`Confirm: ${confirmAction.type.toUpperCase()}`}
            description={`Proceed with "${confirmAction.type}" on user account: ${confirmAction.userName}?`}
            confirmLabel="Confirm Action"
            confirmColor={confirmAction.type === 'suspend' ? 'error' : 'primary'}
            loading={actionMutation.isPending}
            onConfirm={() =>
              actionMutation.mutate({
                type: confirmAction.type,
                userId: confirmAction.userId,
              })
            }
            onClose={() => setConfirmAction(null)}
          />
        )}
      </AppShell>
    </RequireRole>
  );
}

