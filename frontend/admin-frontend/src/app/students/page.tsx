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
import Divider from '@mui/material/Divider';
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
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CheckIcon from '@mui/icons-material/Check';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';
import { adminStudentApi, studentKeys } from '@/features/students/api';
import { StudentCreatePayload } from '@/features/students/types';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';
import AppDatePicker from '@/components/ui/AppDatePicker';

const createStudentSchema = z.object({
  email: z.string().email('Valid email is required').trim().toLowerCase(),
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  dob: z.string().min(1, 'Date of birth is required'),
  department: z.string().min(1, 'Department is required').trim().default('General'),
  admission_date: z.string().min(1, 'Admission date is required'),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().email('Invalid guardian email').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

const editStudentSchema = z.object({
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  dob: z.string().min(1, 'Date of birth is required'),
  department: z.string().min(1, 'Department is required').trim(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().email('Invalid guardian email').optional().or(z.literal('')),
  transfer_reason: z.string().optional(),
});

type CreateStudentFormData = z.infer<typeof createStudentSchema>;
type EditStudentFormData = z.infer<typeof editStudentSchema>;

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

  // Edit Student State
  const [editingStudent, setEditingStudent] = React.useState<any | null>(null);
  const [editYearId, setEditYearId] = React.useState<string>('');
  const [editGradeId, setEditGradeId] = React.useState<string>('');
  const [editSectionId, setEditSectionId] = React.useState<string>('');

  const { data: editGradesList, isLoading: loadingEditGrades } = useQuery({
    queryKey: gradeKeys.list({ academic_year_id: editYearId, status: 'active', size: 100 }),
    queryFn: () => adminGradeApi.listGrades({ academic_year_id: editYearId, status: 'active', size: 100 }),
    enabled: Boolean(editYearId),
  });

  const { data: rawEditSectionsList, isLoading: loadingEditSections } = useQuery({
    queryKey: ['sections-for-grade-edit', editGradeId],
    queryFn: () => adminGradeApi.getGradeSections(editGradeId),
    enabled: Boolean(editGradeId),
  });
  const editSectionsList: any[] = Array.isArray(rawEditSectionsList)
    ? rawEditSectionsList
    : ((rawEditSectionsList as any)?.items || []);

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    watch: watchEdit,
    formState: { errors: errorsEdit, isSubmitting: isUpdating },
  } = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
  });

  const openEditModal = async (studentItem: any) => {
    try {
      const fullProfile = await adminStudentApi.getStudentProfile(studentItem.id);
      setEditingStudent(fullProfile);
      resetEdit({
        first_name: fullProfile.first_name,
        last_name: fullProfile.last_name,
        dob: fullProfile.dob,
        department: fullProfile.department || 'General',
        guardian_name: fullProfile.guardian_name || '',
        guardian_phone: fullProfile.guardian_phone || '',
        guardian_email: fullProfile.guardian_email || '',
        transfer_reason: '',
      });
      setEditYearId('');
      setEditGradeId('');
      setEditSectionId('');
    } catch (err) {
      showSnackbar(formatErrorMessage(err, 'Failed to fetch student profile'), 'error');
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: EditStudentFormData) => {
      const updateData: any = {
        first_name: payload.first_name,
        last_name: payload.last_name,
        dob: payload.dob,
        department: payload.department,
        guardian_name: payload.guardian_name || null,
        guardian_phone: payload.guardian_phone || null,
        guardian_email: payload.guardian_email || null,
      };
      if (editSectionId) {
        updateData.target_grade_id = editGradeId;
        updateData.target_section_id = editSectionId;
        updateData.target_academic_year_id = editYearId;
        updateData.transfer_reason = payload.transfer_reason || 'Admin transfer';
      }
      return adminStudentApi.updateStudent(editingStudent.id, updateData);
    },
    onSuccess: () => {
      showSnackbar('Student record updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      setEditingStudent(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to update student'), 'error');
    },
  });
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'suspend' | 'activate' | 'deactivate' | 'resend-invite' | 'password-reset';
    userId: string;
    userName: string;
  } | null>(null);

  // Academic Structure Dependent Dropdown States
  const [enrollYearId, setEnrollYearId] = React.useState<string>('');
  const [enrollGradeId, setEnrollGradeId] = React.useState<string>('');
  const [enrollSectionId, setEnrollSectionId] = React.useState<string>('');

  const { data: academicYears = [] } = useQuery({
    queryKey: gradeKeys.academicYears,
    queryFn: adminGradeApi.listAcademicYears,
  });

  React.useEffect(() => {
    if (!enrollYearId && academicYears.length > 0) {
      const current = academicYears.find((y) => y.is_current) || academicYears[0];
      setEnrollYearId(current.id);
    }
  }, [academicYears, enrollYearId]);

  const { data: gradesList } = useQuery({
    queryKey: gradeKeys.list({ academic_year_id: enrollYearId, status: 'active', size: 100 }),
    queryFn: () => adminGradeApi.listGrades({ academic_year_id: enrollYearId, status: 'active', size: 100 }),
    enabled: Boolean(enrollYearId),
  });

  const { data: rawSectionsList } = useQuery({
    queryKey: ['sections-for-grade', enrollGradeId],
    queryFn: () => adminGradeApi.getGradeSections(enrollGradeId),
    enabled: Boolean(enrollGradeId),
  });
  const sectionsList: any[] = Array.isArray(rawSectionsList)
    ? rawSectionsList
    : ((rawSectionsList as any)?.items || []);

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

  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [createdStudentCredentials, setCreatedStudentCredentials] = React.useState<{
    name: string;
    enrollmentNumber: string;
    studentCode: string;
    email: string;
    password?: string;
    portalUrl: string;
  } | null>(null);
  const [copiedStudent, setCopiedStudent] = React.useState(false);

  // Form for student creation
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting: isCreating },
  } = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      dob: '2008-01-01',
      admission_date: new Date().toISOString().split('T')[0],
      department: 'General',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: StudentCreatePayload) => {
      const res = await adminStudentApi.createStudent(payload);
      return res;
    },
    onSuccess: (data, variables) => {
      const enrollNo = data?.enrollment_number || data?.student?.enrollment_number;
      showSnackbar(`Student created successfully! Enrollment Number: ${enrollNo}`, 'success');
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      setOpenCreateDialog(false);
      reset();
      setEnrollGradeId('');
      setEnrollSectionId('');

      if (data?.initial_password || variables.password) {
        setCreatedStudentCredentials({
          name: `${data.student.first_name} ${data.student.last_name}`,
          enrollmentNumber: enrollNo,
          studentCode: data.student.student_code,
          email: variables.email,
          password: data.initial_password || variables.password,
          portalUrl: 'http://localhost:3001/login',
        });
      }
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
    if (!enrollYearId || !enrollGradeId || !enrollSectionId) {
      showSnackbar('Academic Year, Grade, and Section are all required!', 'error');
      return;
    }
    createMutation.mutate({
      ...formData,
      academic_year_id: enrollYearId,
      grade_id: enrollGradeId,
      section_id: enrollSectionId,
      guardian_email: formData.guardian_email || undefined,
    });
  };

  const columns: GridColDef[] = [
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
              <Tooltip title="Edit Student & Enrollment">
                <IconButton
                  size="small"
                  color="info"
                  onClick={() => openEditModal(u.student)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

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
                {/* Dependent Academic Hierarchy: Year -> Grade -> Section */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Academic Year *"
                    value={enrollYearId}
                    onChange={(e) => {
                      setEnrollYearId(e.target.value);
                      setEnrollGradeId('');
                      setEnrollSectionId('');
                    }}
                  >
                    {academicYears.map((year) => (
                      <MenuItem key={year.id} value={year.id}>
                        {year.name} {year.is_current ? '(Current)' : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Grade / Class *"
                    value={enrollGradeId}
                    disabled={!enrollYearId || !gradesList?.items?.length}
                    onChange={(e) => {
                      const gId = e.target.value;
                      setEnrollGradeId(gId);
                      setEnrollSectionId('');
                    }}
                    helperText={!gradesList?.items?.length && enrollYearId ? 'No active grades in this year' : undefined}
                  >
                    <MenuItem value="" disabled>
                      Select grade...
                    </MenuItem>
                    {gradesList?.items?.map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name} {g.code ? `(${g.code})` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Section *"
                    value={enrollSectionId}
                    disabled={!enrollGradeId || !sectionsList?.length}
                    onChange={(e) => {
                      const secId = e.target.value;
                      setEnrollSectionId(secId);
                    }}
                    helperText={!sectionsList?.length && enrollGradeId ? 'No sections in this grade' : undefined}
                  >
                    <MenuItem value="" disabled>
                      Select section...
                    </MenuItem>
                    {sectionsList?.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        Section {s.name} ({s.total_students}/{s.class_capacity || 30})
                      </MenuItem>
                    ))}
                  </TextField>
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
                  <AppDatePicker
                    label="Date of Birth"
                    value={watch('dob')}
                    onChange={(val) => setValue('dob', val, { shouldValidate: true })}
                    error={!!errors.dob}
                    helperText={errors.dob?.message}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <AppDatePicker
                    label="Admission Date"
                    value={watch('admission_date')}
                    onChange={(val) => setValue('admission_date', val, { shouldValidate: true })}
                    error={!!errors.admission_date}
                    helperText={errors.admission_date?.message}
                    required
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
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                      fullWidth
                      label="Initial Password (Optional)"
                      placeholder="Leave blank to invite via email, or set password now"
                      error={!!errors.password}
                      helperText={errors.password?.message || "Set initial password so student can log in directly to Student Portal"}
                      {...register('password')}
                    />
                    <Button
                      variant="outlined"
                      sx={{ height: 56, whiteSpace: 'nowrap' }}
                      onClick={() => {
                        const randomPwd = `Student@${Math.floor(1000 + Math.random() * 9000)}`;
                        setValue('password', randomPwd);
                      }}
                    >
                      Generate
                    </Button>
                  </Box>
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
                {isCreating ? 'Creating...' : 'Enroll Student'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>

        {/* Student Credentials Created Dialog */}
        <Dialog open={Boolean(createdStudentCredentials)} onClose={() => setCreatedStudentCredentials(null)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKeyIcon color="primary" /> Student Account Credentials Created
          </DialogTitle>
          <DialogContent dividers>
            {createdStudentCredentials && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="success">
                  Student account and academic enrollment are active. The student can immediately log in to the Student Portal with these credentials:
                </Alert>
                <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">STUDENT NAME</Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
                    {createdStudentCredentials.name}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">LOGIN IDENTIFIER (ENROLLMENT NUMBER)</Typography>
                  <Typography variant="body1" fontWeight={700} color="primary.main" sx={{ mb: 1.5 }}>
                    {createdStudentCredentials.enrollmentNumber}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">STUDENT CODE / EMAIL</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Code: <strong>{createdStudentCredentials.studentCode}</strong> • Email: <strong>{createdStudentCredentials.email}</strong>
                  </Typography>

                  <Typography variant="caption" color="text.secondary">PASSWORD</Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5, fontFamily: 'monospace', letterSpacing: 1 }}>
                    {createdStudentCredentials.password || 'Set via invite link'}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">STUDENT PORTAL URL</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {createdStudentCredentials.portalUrl}
                  </Typography>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={copiedStudent ? <CheckIcon color="success" /> : <ContentCopyIcon />}
              onClick={() => {
                if (createdStudentCredentials) {
                  const text = `Student Portal Login Credentials:\nName: ${createdStudentCredentials.name}\nEnrollment No (Login ID): ${createdStudentCredentials.enrollmentNumber}\nStudent Code: ${createdStudentCredentials.studentCode}\nEmail: ${createdStudentCredentials.email}\nPassword: ${createdStudentCredentials.password}\nPortal URL: ${createdStudentCredentials.portalUrl}`;
                  navigator.clipboard.writeText(text);
                  setCopiedStudent(true);
                  setTimeout(() => setCopiedStudent(false), 2500);
                }
              }}
            >
              {copiedStudent ? 'Copied to Clipboard' : 'Copy Credentials'}
            </Button>
            <Button
              variant="contained"
              onClick={() => setCreatedStudentCredentials(null)}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Student Dialog */}
        <Dialog open={Boolean(editingStudent)} onClose={() => setEditingStudent(null)} maxWidth="md" fullWidth>
          <DialogTitle fontWeight={700}>
            Edit Student & Academic Enrollment
          </DialogTitle>
          {editingStudent && (
            <Box component="form" onSubmit={handleSubmitEdit((formData) => updateMutation.mutate(formData))} noValidate>
              <DialogContent dividers>
                {/* Current Active Enrollment Read-only Header */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Current Active Enrollment
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="caption" color="text.secondary">Enrollment No.</Typography>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {editingStudent.enrollment_number || editingStudent.student_code || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="caption" color="text.secondary">Academic Year</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {editingStudent.current_academic_year || 'Not Assigned'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="caption" color="text.secondary">Grade & Section</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {editingStudent.current_grade ? `${editingStudent.current_grade} - Sec ${editingStudent.current_section}` : 'Not Enrolled'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="caption" color="text.secondary">Class Teacher</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {editingStudent.class_teacher_name || 'None Assigned'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                  Personal Information
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      error={!!errorsEdit.first_name}
                      helperText={errorsEdit.first_name?.message}
                      {...registerEdit('first_name')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      error={!!errorsEdit.last_name}
                      helperText={errorsEdit.last_name?.message}
                      {...registerEdit('last_name')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <AppDatePicker
                      label="Date of Birth"
                      value={watchEdit('dob')}
                      onChange={(val) => setValueEdit('dob', val, { shouldValidate: true })}
                      error={!!errorsEdit.dob}
                      helperText={errorsEdit.dob?.message}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Department"
                      error={!!errorsEdit.department}
                      helperText={errorsEdit.department?.message}
                      {...registerEdit('department')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Guardian Name"
                      {...registerEdit('guardian_name')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Guardian Phone"
                      {...registerEdit('guardian_phone')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Guardian Email"
                      error={!!errorsEdit.guardian_email}
                      helperText={errorsEdit.guardian_email?.message}
                      {...registerEdit('guardian_email')}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Section Transfer / Reassignment */}
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                  Transfer Section / Grade (Optional)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  To transfer or reassign the student, select a new Academic Year, Grade, and Section below. Previous enrollment history will be preserved.
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      select
                      label="New Academic Year"
                      value={editYearId}
                      onChange={(e) => {
                        setEditYearId(e.target.value);
                        setEditGradeId('');
                        setEditSectionId('');
                      }}
                      helperText="Leave unselected if keeping current section"
                    >
                      <MenuItem value="">
                        <em>None (No transfer)</em>
                      </MenuItem>
                      {academicYears.map((year) => (
                        <MenuItem key={year.id} value={year.id}>
                          {year.name} {year.is_current ? '(Current)' : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      select
                      label="New Grade / Class"
                      value={editGradeId}
                      disabled={!editYearId || loadingEditGrades || !editGradesList?.items?.length}
                      onChange={(e) => {
                        setEditGradeId(e.target.value);
                        setEditSectionId('');
                      }}
                      helperText={
                        !editYearId
                          ? 'Select Year first'
                          : loadingEditGrades
                          ? 'Loading grades...'
                          : !editGradesList?.items?.length
                          ? 'No active grades'
                          : undefined
                      }
                    >
                      <MenuItem value="" disabled>
                        Select grade...
                      </MenuItem>
                      {editGradesList?.items?.map((g) => (
                        <MenuItem key={g.id} value={g.id}>
                          {g.name} {g.code ? `(${g.code})` : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      select
                      label="New Section"
                      value={editSectionId}
                      disabled={!editGradeId || loadingEditSections || !editSectionsList?.length}
                      onChange={(e) => setEditSectionId(e.target.value)}
                      helperText={
                        !editGradeId
                          ? 'Select Grade first'
                          : loadingEditSections
                          ? 'Loading sections...'
                          : !editSectionsList?.length
                          ? 'No active sections'
                          : undefined
                      }
                    >
                      <MenuItem value="" disabled>
                        Select section...
                      </MenuItem>
                      {editSectionsList?.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          Section {s.name} ({s.total_students}/{s.class_capacity || 30})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  {editSectionId && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Transfer Reason"
                        placeholder="e.g. Promoted to higher grade, Parent requested class change, Stream shift"
                        error={!!errorsEdit.transfer_reason}
                        helperText={errorsEdit.transfer_reason?.message}
                        {...registerEdit('transfer_reason')}
                      />
                    </Grid>
                  )}
                </Grid>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setEditingStudent(null)} color="inherit" disabled={isUpdating}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isUpdating}
                  startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogActions>
            </Box>
          )}
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
