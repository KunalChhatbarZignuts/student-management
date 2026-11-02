'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import InputAdornment from '@mui/material/InputAdornment';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import SchoolIcon from '@mui/icons-material/School';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { adminTeacherApi } from '@/features/teachers/api';
import { Grade, GradeCreatePayload, GradeUpdatePayload } from '@/features/grades/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

const gradeFormSchema = z.object({
  name: z.string().min(1, 'Grade name is required').max(50),
  code: z.string().max(20).optional().or(z.literal('')),
  description: z.string().max(255).optional().or(z.literal('')),
  level: z.coerce.number().min(0, 'Level must be >= 0').max(20, 'Level must be <= 20'),
  academic_year_id: z.string().min(1, 'Academic Year is required'),
  coordinator_teacher_id: z.string().optional().or(z.literal('')),
});

type GradeFormData = z.infer<typeof gradeFormSchema>;

export default function GradesManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  // Filters & Pagination
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [academicYearId, setAcademicYearId] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Modal states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingGrade, setEditingGrade] = React.useState<Grade | null>(null);
  const [toggleStatusGrade, setToggleStatusGrade] = React.useState<Grade | null>(null);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Academic Years
  const { data: academicYears = [] } = useQuery({
    queryKey: gradeKeys.academicYears,
    queryFn: adminGradeApi.listAcademicYears,
  });

  // Set default current academic year if none selected
  React.useEffect(() => {
    if (!academicYearId && academicYears.length > 0) {
      const current = academicYears.find((y) => y.is_current) || academicYears[0];
      setAcademicYearId(current.id);
    }
  }, [academicYears, academicYearId]);

  // Load Teachers for coordinator dropdown
  const { data: teachersData } = useQuery({
    queryKey: ['teachers', 'active-list'],
    queryFn: () => adminTeacherApi.listTeachers({ limit: 100, status: 'active' }),
  });

  // Load Grades
  const { data: gradesData, isLoading } = useQuery({
    queryKey: gradeKeys.list({
      page: page + 1,
      size: rowsPerPage,
      search: debouncedSearch || undefined,
      academic_year_id: academicYearId || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    queryFn: () =>
      adminGradeApi.listGrades({
        page: page + 1,
        size: rowsPerPage,
        search: debouncedSearch || undefined,
        academic_year_id: academicYearId || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    enabled: true,
  });

  // Create Form
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    setValue: setCreateValue,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      level: 1,
      academic_year_id: academicYearId,
      coordinator_teacher_id: '',
    },
  });

  // Edit Form
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isUpdating },
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeFormSchema),
  });

  React.useEffect(() => {
    if (academicYearId) {
      setCreateValue('academic_year_id', academicYearId);
    }
  }, [academicYearId, setCreateValue]);

  // Mutations
  const createGradeMutation = useMutation({
    mutationFn: (payload: GradeCreatePayload) => adminGradeApi.createGrade(payload),
    onSuccess: () => {
      showSnackbar('Grade created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      setCreateDialogOpen(false);
      resetCreate();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to create grade'), 'error');
    },
  });

  const updateGradeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GradeUpdatePayload }) =>
      adminGradeApi.updateGrade(id, payload),
    onSuccess: () => {
      showSnackbar('Grade updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      setEditingGrade(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to update grade'), 'error');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      adminGradeApi.updateGradeStatus(id, status),
    onSuccess: (_, vars) => {
      showSnackbar(`Grade status changed to ${vars.status}!`, 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      setToggleStatusGrade(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to update grade status'), 'error');
    },
  });

  const onOpenEdit = (grade: Grade) => {
    setEditingGrade(grade);
    resetEdit({
      name: grade.name,
      code: grade.code || '',
      description: grade.description || '',
      level: grade.level,
      academic_year_id: grade.academic_year_id,
      coordinator_teacher_id: grade.coordinator_teacher_id || '',
    });
  };

  const onSubmitCreate = (data: GradeFormData) => {
    createGradeMutation.mutate({
      ...data,
      code: data.code || undefined,
      description: data.description || undefined,
      coordinator_teacher_id: data.coordinator_teacher_id || undefined,
    });
  };

  const onSubmitEdit = (data: GradeFormData) => {
    if (!editingGrade) return;
    updateGradeMutation.mutate({
      id: editingGrade.id,
      payload: {
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        level: data.level,
        coordinator_teacher_id: data.coordinator_teacher_id || null,
      },
    });
  };

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Grades & Sections Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure academic levels, manage section capacities, assign class teachers & coordinators.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetCreate({
                  name: '',
                  code: '',
                  description: '',
                  level: 1,
                  academic_year_id: academicYearId || '',
                  coordinator_teacher_id: '',
                });
                setCreateDialogOpen(true);
              }}
            >
              Add Grade
            </Button>
          </Box>

          {/* Filter Bar */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search grades by name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Academic Year"
                  value={academicYearId}
                  onChange={(e) => {
                    setAcademicYearId(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">
                    <em>All Years</em>
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
                  size="small"
                  select
                  label="Status Filter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="active">Active Only</MenuItem>
                  <MenuItem value="inactive">Inactive Only</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Paper>

          {/* Grades Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Grade Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Level</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Academic Year</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Coordinator Teacher</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Sections
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Enrolled Students
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} />
                    </TableCell>
                  </TableRow>
                ) : !gradesData?.items || gradesData.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        No grades found matching the selected filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  gradesData.items.map((grade) => (
                    <TableRow
                      key={grade.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/grades/${grade.id}`)}
                    >
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                          {grade.name}
                        </Typography>
                        {grade.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {grade.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={grade.code || 'N/A'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{grade.level}</TableCell>
                      <TableCell>{grade.academic_year_name || '-'}</TableCell>
                      <TableCell>
                        {grade.coordinator_name ? (
                          <Typography variant="body2" fontWeight={500}>
                            {grade.coordinator_name}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Not assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={grade.total_sections}
                          color={grade.total_sections > 0 ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={grade.total_students}
                          color={grade.total_students > 0 ? 'info' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={grade.status.toUpperCase()}
                          color={grade.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="View Sections & Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => router.push(`/grades/${grade.id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Grade">
                          <IconButton size="small" onClick={() => onOpenEdit(grade)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={grade.status === 'active' ? 'Deactivate Grade' : 'Activate Grade'}>
                          <IconButton
                            size="small"
                            color={grade.status === 'active' ? 'warning' : 'success'}
                            onClick={() => setToggleStatusGrade(grade)}
                          >
                            {grade.status === 'active' ? (
                              <BlockIcon fontSize="small" />
                            ) : (
                              <CheckCircleIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={gradesData?.total || 0}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </TableContainer>

          {/* Create Grade Dialog */}
          <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add Academic Grade</DialogTitle>
            <form onSubmit={handleCreateSubmit(onSubmitCreate)}>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Grade Name *"
                      placeholder="e.g. Grade 10"
                      {...registerCreate('name')}
                      error={Boolean(createErrors.name)}
                      helperText={createErrors.name?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Grade Code"
                      placeholder="e.g. G10"
                      {...registerCreate('code')}
                      error={Boolean(createErrors.code)}
                      helperText={createErrors.code?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Level (0-20) *"
                      {...registerCreate('level')}
                      error={Boolean(createErrors.level)}
                      helperText={createErrors.level?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Academic Year *"
                      defaultValue={academicYearId || ''}
                      {...registerCreate('academic_year_id')}
                      error={Boolean(createErrors.academic_year_id)}
                      helperText={createErrors.academic_year_id?.message}
                    >
                      {academicYears.map((year) => (
                        <MenuItem key={year.id} value={year.id}>
                          {year.name} {year.is_current ? '(Current)' : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Grade Coordinator (Optional)"
                      defaultValue=""
                      {...registerCreate('coordinator_teacher_id')}
                      helperText="Optional senior teacher responsible for coordinating this grade level."
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {teachersData?.items?.map((item) => {
                        const name = item.teacher
                          ? `${item.teacher.first_name} ${item.teacher.last_name}`
                          : item.email;
                        const teacherId = item.teacher?.id || item.id;
                        return (
                          <MenuItem key={item.id} value={teacherId}>
                            {name} ({item.email})
                          </MenuItem>
                        );
                      })}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Description"
                      placeholder="Brief notes about curriculum or age bracket..."
                      {...registerCreate('description')}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isCreating}>
                  {isCreating ? <CircularProgress size={24} /> : 'Create Grade'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {/* Edit Grade Dialog */}
          <Dialog open={Boolean(editingGrade)} onClose={() => setEditingGrade(null)} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Grade: {editingGrade?.name}</DialogTitle>
            <form onSubmit={handleEditSubmit(onSubmitEdit)}>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Grade Name *"
                      {...registerEdit('name')}
                      error={Boolean(editErrors.name)}
                      helperText={editErrors.name?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Grade Code"
                      {...registerEdit('code')}
                      error={Boolean(editErrors.code)}
                      helperText={editErrors.code?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Level (0-20) *"
                      {...registerEdit('level')}
                      error={Boolean(editErrors.level)}
                      helperText={editErrors.level?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      disabled
                      label="Academic Year"
                      value={editingGrade?.academic_year_name || ''}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Grade Coordinator (Optional)"
                      defaultValue={editingGrade?.coordinator_teacher_id || ''}
                      {...registerEdit('coordinator_teacher_id')}
                      helperText="Optional senior teacher responsible for coordinating this grade level."
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {teachersData?.items?.map((item) => {
                        const name = item.teacher
                          ? `${item.teacher.first_name} ${item.teacher.last_name}`
                          : item.email;
                        const teacherId = item.teacher?.id || item.id;
                        return (
                          <MenuItem key={item.id} value={teacherId}>
                            {name} ({item.email})
                          </MenuItem>
                        );
                      })}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Description"
                      {...registerEdit('description')}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditingGrade(null)}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isUpdating}>
                  {isUpdating ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {/* Toggle Status Confirmation Dialog */}
          <ConfirmDialog
            open={Boolean(toggleStatusGrade)}
            title={
              toggleStatusGrade?.status === 'active'
                ? `Deactivate Grade "${toggleStatusGrade?.name}"?`
                : `Activate Grade "${toggleStatusGrade?.name}"?`
            }
            description={
              toggleStatusGrade?.status === 'active'
                ? 'Deactivating this grade will prevent new enrollments. Note: A grade cannot be deactivated if it contains active sections with enrolled students.'
                : 'Activating this grade will allow new sections and student enrollments.'
            }
            confirmColor={toggleStatusGrade?.status === 'active' ? 'error' : 'primary'}
            confirmLabel={toggleStatusGrade?.status === 'active' ? 'Deactivate' : 'Activate'}
            loading={toggleStatusMutation.isPending}
            onConfirm={() => {
              if (toggleStatusGrade) {
                toggleStatusMutation.mutate({
                  id: toggleStatusGrade.id,
                  status: toggleStatusGrade.status === 'active' ? 'inactive' : 'active',
                });
              }
            }}
            onClose={() => setToggleStatusGrade(null)}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}
