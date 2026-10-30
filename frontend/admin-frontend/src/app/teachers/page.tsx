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

import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LockResetIcon from '@mui/icons-material/LockReset';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';
import { adminTeacherApi, teacherKeys } from '@/features/teachers/api';
import { adminStudentApi } from '@/features/students/api';
import { TeacherCreatePayload } from '@/features/teachers/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

const createTeacherSchema = z.object({
  email: z.string().email('Valid email is required').trim().toLowerCase(),
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  department: z.string().min(1, 'Department is required').trim(),
  phone: z.string().optional(),
});

type CreateTeacherFormData = z.infer<typeof createTeacherSchema>;

export default function TeachersManagementPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'suspend' | 'activate' | 'resend-invite' | 'password-reset';
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
    status: statusFilter || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: teacherKeys.list(queryParams),
    queryFn: () => adminTeacherApi.listTeachers(queryParams),
    placeholderData: keepPreviousData,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isCreating },
  } = useForm<CreateTeacherFormData>({
    resolver: zodResolver(createTeacherSchema),
    defaultValues: {
      department: 'Science',
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: TeacherCreatePayload) => adminTeacherApi.createTeacher(payload),
    onSuccess: () => {
      showSnackbar('Teacher created successfully and invitation sent!', 'success');
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
      setOpenCreateDialog(false);
      reset();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to create teacher account'), 'error');
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      type,
      userId,
    }: {
      type: string;
      userId: string;
    }) => {
      switch (type) {
        case 'suspend':
          return adminStudentApi.suspendUser(userId);
        case 'activate':
          return adminStudentApi.activateUser(userId);
        case 'resend-invite':
          return adminStudentApi.resendInvite(userId);
        case 'password-reset':
          return adminStudentApi.triggerPasswordReset(userId);
        default:
          throw new Error('Unknown action');
      }
    },
    onSuccess: (_, vars) => {
      showSnackbar(`Action "${vars.type}" performed successfully!`, 'success');
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
      setConfirmAction(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to execute action'), 'error');
    },
  });

  const columns: GridColDef[] = [
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
      renderCell: (params) => {
        const status = params.row.status;
        const color =
          status === 'active'
            ? 'success'
            : status === 'invited'
              ? 'warning'
              : 'error';
        return <Chip label={status.toUpperCase()} color={color} size="small" />;
      },
    },
    {
      field: 'actions',
      headerName: 'Row Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => {
        const u = params.row;
        const teacherName = u.teacher
          ? `${u.teacher.first_name} ${u.teacher.last_name}`
          : u.email;

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {u.status === 'invited' && (
              <Tooltip title="Resend Invite">
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() =>
                    setConfirmAction({
                      type: 'resend-invite',
                      userId: u.id,
                      userName: teacherName,
                    })
                  }
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
                  onClick={() =>
                    setConfirmAction({
                      type: 'suspend',
                      userId: u.id,
                      userName: teacherName,
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
                      userName: teacherName,
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
                    userName: teacherName,
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
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Faculty & Teachers Directory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage instructors, server-generated employee codes, and assign department roles.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
          >
            Create Teacher
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search teacher email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status Filter"
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

        {/* Create Teacher Dialog */}
        <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>Add Faculty Member</DialogTitle>
          <Box component="form" onSubmit={handleSubmit((d) => createMutation.mutate(d))} noValidate>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message}
                    {...register('first_name')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    error={!!errors.last_name}
                    helperText={errors.last_name?.message}
                    {...register('last_name')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Teacher Email Address"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    {...register('email')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Department"
                    error={!!errors.department}
                    helperText={errors.department?.message}
                    {...register('department')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number (Optional)"
                    {...register('phone')}
                  />
                </Grid>
              </Grid>
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
                {isCreating ? 'Creating...' : 'Create & Send Invite'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>

        {confirmAction && (
          <ConfirmDialog
            open={Boolean(confirmAction)}
            title={`Confirm: ${confirmAction.type.toUpperCase()}`}
            description={`Are you sure you want to proceed with "${confirmAction.type}" on teacher account: ${confirmAction.userName}?`}
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

