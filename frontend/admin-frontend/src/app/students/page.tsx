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
import Alert from '@mui/material/Alert';
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
import { adminStudentApi, studentKeys } from '@/features/students/api';
import { StudentCreatePayload } from '@/features/students/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

const createStudentSchema = z.object({
  email: z.string().email('Valid email is required').trim().toLowerCase(),
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  dob: z.string().min(1, 'Date of birth is required'),
  class_name: z.string().min(1, 'Class name is required').trim(),
  section: z.string().min(1, 'Section is required').trim(),
  department: z.string().min(1, 'Department is required').trim(),
  admission_date: z.string().min(1, 'Admission date is required'),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().email('Invalid guardian email').optional().or(z.literal('')),
});

type CreateStudentFormData = z.infer<typeof createStudentSchema>;

export default function StudentsManagementPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  // Search & Filter state
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  // Action Dialog state
  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'suspend' | 'activate' | 'deactivate' | 'resend-invite' | 'password-reset';
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

  // Server-side paginated query
  const queryParams = {
    skip: paginationModel.page * paginationModel.pageSize,
    limit: paginationModel.pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: studentKeys.list(queryParams),
    queryFn: () => adminStudentApi.listStudents(queryParams),
    placeholderData: keepPreviousData,
  });

  // Form for student creation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isCreating },
  } = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      dob: '2008-01-01',
      admission_date: new Date().toISOString().split('T')[0],
      department: 'CS',
      class_name: 'Grade 10',
      section: 'A',
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: StudentCreatePayload) => adminStudentApi.createStudent(payload),
    onSuccess: () => {
      showSnackbar('Student created successfully and invite dispatched!', 'success');
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      setOpenCreateDialog(false);
      reset();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to create student'), 'error');
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
        case 'deactivate':
          return adminStudentApi.deactivateUser(userId);
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
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      setConfirmAction(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to perform action'), 'error');
    },
  });

  const handleCreateSubmit = (formData: CreateStudentFormData) => {
    createMutation.mutate({
      ...formData,
      guardian_email: formData.guardian_email || undefined,
    });
  };

  const columns: GridColDef[] = [
    {
      field: 'student_code',
      headerName: 'Student Code (ID)',
      width: 160,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700} color="primary.main">
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
      width: 190,
      sortable: false,
      renderCell: (params) => {
        const u = params.row;
        const studentName = u.student
          ? `${u.student.first_name} ${u.student.last_name}`
          : u.email;

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {u.status === 'invited' && (
              <Tooltip title="Resend Activation Invite">
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() =>
                    setConfirmAction({
                      type: 'resend-invite',
                      userId: u.id,
                      userName: studentName,
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
                      userName: studentName,
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
                      userName: studentName,
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
                    userName: studentName,
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
              Students Directory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage student enrollment, generate server-issued student codes, and administer account states.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
          >
            Create Student
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by student email..."
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
                <MenuItem value="deactivated">Deactivated</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* DataGrid */}
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

        {/* Create Student Dialog */}
        <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>Enroll New Student</DialogTitle>
          <Box component="form" onSubmit={handleSubmit(handleCreateSubmit)} noValidate>
            <DialogContent dividers>
              <Alert severity="info" sx={{ mb: 2 }}>
                Student ID (code) is generated strictly by the server upon submission and cannot be manually modified.
              </Alert>

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
                    label="Student Email Address"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    {...register('email')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Class Name"
                    error={!!errors.class_name}
                    helperText={errors.class_name?.message}
                    {...register('class_name')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Section"
                    error={!!errors.section}
                    helperText={errors.section?.message}
                    {...register('section')}
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
                    label="Date of Birth"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.dob}
                    helperText={errors.dob?.message}
                    {...register('dob')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Admission Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.admission_date}
                    helperText={errors.admission_date?.message}
                    {...register('admission_date')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Guardian Name"
                    {...register('guardian_name')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Guardian Phone"
                    {...register('guardian_phone')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Guardian Email"
                    error={!!errors.guardian_email}
                    helperText={errors.guardian_email?.message}
                    {...register('guardian_email')}
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
                {isCreating ? 'Creating...' : 'Enroll & Dispatch Invite'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>

        {/* Confirmation Dialog for Row Actions */}
        {confirmAction && (
          <ConfirmDialog
            open={Boolean(confirmAction)}
            title={`Confirm: ${confirmAction.type.toUpperCase()}`}
            description={`Are you sure you want to perform "${confirmAction.type}" on student account: ${confirmAction.userName}?`}
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
