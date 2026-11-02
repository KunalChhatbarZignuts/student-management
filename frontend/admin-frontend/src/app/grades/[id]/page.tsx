'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import GroupIcon from '@mui/icons-material/Group';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { adminTeacherApi } from '@/features/teachers/api';
import {
  Section,
  SectionCreatePayload,
  SectionUpdatePayload,
  StudentTransferPayload,
  EnrolledStudentItem,
} from '@/features/grades/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

const sectionFormSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(50),
  code: z.string().max(20).optional().or(z.literal('')),
  class_capacity: z.coerce.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity cannot exceed 100'),
  assigned_teacher_id: z.string().optional().or(z.literal('')),
});

type SectionFormData = z.infer<typeof sectionFormSchema>;

const transferSchema = z.object({
  target_section_id: z.string().min(1, 'Target section is required'),
  reason: z.string().max(255).optional().or(z.literal('')),
});

type TransferFormData = z.infer<typeof transferSchema>;

export default function GradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const gradeId = params?.id as string;

  // Modals state
  const [createSectionOpen, setCreateSectionOpen] = React.useState(false);
  const [editingSection, setEditingSection] = React.useState<Section | null>(null);
  const [assignTeacherSection, setAssignTeacherSection] = React.useState<Section | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>('');
  const [rosterSection, setRosterSection] = React.useState<Section | null>(null);
  const [transferringStudent, setTransferringStudent] = React.useState<EnrolledStudentItem | null>(null);
  const [toggleStatusSection, setToggleStatusSection] = React.useState<Section | null>(null);

  // Load Grade Details
  const { data: grade, isLoading: loadingGrade } = useQuery({
    queryKey: gradeKeys.detail(gradeId),
    queryFn: () => adminGradeApi.getGrade(gradeId),
    enabled: Boolean(gradeId),
  });

  // Load Teachers for class teacher dropdown
  const { data: teachersData } = useQuery({
    queryKey: ['teachers', 'active-list'],
    queryFn: () => adminTeacherApi.listTeachers({ limit: 100, status: 'active' }),
  });

  // Load Section Students when roster modal opens
  const { data: rosterData, isLoading: loadingRoster } = useQuery({
    queryKey: gradeKeys.sectionStudents(rosterSection?.id || ''),
    queryFn: () => adminGradeApi.getSectionStudents(rosterSection!.id),
    enabled: Boolean(rosterSection?.id),
  });

  // Create Section Form
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<SectionFormData>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: {
      name: '',
      code: '',
      class_capacity: 30,
      assigned_teacher_id: '',
    },
  });

  // Edit Section Form
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isUpdating },
  } = useForm<SectionFormData>({
    resolver: zodResolver(sectionFormSchema),
  });

  // Transfer Form
  const {
    register: registerTransfer,
    handleSubmit: handleTransferSubmit,
    reset: resetTransfer,
    formState: { errors: transferErrors, isSubmitting: isTransferring },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
  });

  // Mutations
  const createSectionMutation = useMutation({
    mutationFn: (payload: SectionCreatePayload) => adminGradeApi.createSection(payload),
    onSuccess: () => {
      showSnackbar('Section created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      setCreateSectionOpen(false);
      resetCreate();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to create section'), 'error');
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SectionUpdatePayload }) =>
      adminGradeApi.updateSection(id, payload),
    onSuccess: () => {
      showSnackbar('Section updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
      setEditingSection(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to update section'), 'error');
    },
  });

  const assignTeacherMutation = useMutation({
    mutationFn: ({ sectionId, teacherId }: { sectionId: string; teacherId: string }) =>
      adminGradeApi.assignTeacher(sectionId, teacherId),
    onSuccess: () => {
      showSnackbar('Class Teacher assigned successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
      setAssignTeacherSection(null);
      setSelectedTeacherId('');
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to assign class teacher'), 'error');
    },
  });

  const removeTeacherMutation = useMutation({
    mutationFn: (sectionId: string) => adminGradeApi.removeTeacher(sectionId),
    onSuccess: () => {
      showSnackbar('Class Teacher removed successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to remove class teacher'), 'error');
    },
  });

  const toggleSectionStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      adminGradeApi.updateSectionStatus(id, status),
    onSuccess: (_, vars) => {
      showSnackbar(`Section status changed to ${vars.status}!`, 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
      setToggleStatusSection(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to update section status'), 'error');
    },
  });

  const transferStudentMutation = useMutation({
    mutationFn: ({ studentId, payload }: { studentId: string; payload: StudentTransferPayload }) =>
      adminGradeApi.transferStudent(studentId, payload),
    onSuccess: () => {
      showSnackbar('Student transferred successfully and history recorded!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
      queryClient.invalidateQueries({ queryKey: gradeKeys.sectionStudents(rosterSection?.id || '') });
      setTransferringStudent(null);
      resetTransfer();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to transfer student'), 'error');
    },
  });

  const onOpenEditSection = (section: Section) => {
    setEditingSection(section);
    resetEdit({
      name: section.name,
      code: section.code || '',
      class_capacity: section.class_capacity || 30,
    });
  };

  const onSubmitCreate = (data: SectionFormData) => {
    if (!grade) return;
    createSectionMutation.mutate({
      grade_id: grade.id,
      name: data.name,
      code: data.code || undefined,
      academic_year_id: grade.academic_year_id,
      class_capacity: data.class_capacity,
      assigned_teacher_id: data.assigned_teacher_id || undefined,
    });
  };

  const onSubmitEdit = (data: SectionFormData) => {
    if (!editingSection) return;
    updateSectionMutation.mutate({
      id: editingSection.id,
      payload: {
        name: data.name,
        code: data.code || undefined,
        class_capacity: data.class_capacity,
      },
    });
  };

  const onSubmitTransfer = (data: TransferFormData) => {
    if (!transferringStudent) return;
    transferStudentMutation.mutate({
      studentId: transferringStudent.student_id,
      payload: {
        target_section_id: data.target_section_id,
        reason: data.reason || undefined,
      },
    });
  };

  if (loadingGrade) {
    return (
      <AppShell>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </AppShell>
    );
  }

  if (!grade) {
    return (
      <AppShell>
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Grade not found.</Typography>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/grades')} sx={{ mt: 2 }}>
            Back to Grades
          </Button>
        </Box>
      </AppShell>
    );
  }

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 1 }}>
          {/* Back button */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/grades')}
            sx={{ mb: 2 }}
          >
            Back to Grades
          </Button>

          {/* Grade Overview Card */}
          <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Typography variant="h4" fontWeight={700}>
                    {grade.name}
                  </Typography>
                  <Chip label={grade.code || 'NO-CODE'} variant="outlined" size="small" />
                  <Chip
                    label={grade.status.toUpperCase()}
                    color={grade.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {grade.description || 'No description provided.'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Academic Year
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {grade.academic_year_name || 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Level
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {grade.level}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Grade Coordinator
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color={grade.coordinator_name ? 'text.primary' : 'text.secondary'}>
                      {grade.coordinator_name || 'Not Assigned'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Total Sections
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {grade.sections?.length || 0}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Total Students
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {grade.total_students || 0}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  resetCreate({
                    name: '',
                    code: '',
                    class_capacity: 30,
                    assigned_teacher_id: '',
                  });
                  setCreateSectionOpen(true);
                }}
              >
                Add Section
              </Button>
            </Box>
          </Paper>

          {/* Sections List */}
          <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
            Sections & Class Teachers
          </Typography>

          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Section</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Class Teacher</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Capacity & Enrollment</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!grade.sections || grade.sections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography variant="body1" color="text.secondary">
                        No sections configured for this grade yet. Click &quot;Add Section&quot; to create one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  grade.sections.map((section) => {
                    const capacity = section.class_capacity || 30;
                    const enrolled = section.total_students || 0;
                    const percent = Math.min(Math.round((enrolled / capacity) * 100), 100);
                    const isFull = enrolled >= capacity;

                    return (
                      <TableRow key={section.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                            {section.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={section.code || 'N/A'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          {section.assigned_teacher_name ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {section.assigned_teacher_name}
                              </Typography>
                              <Tooltip title="Remove Assigned Class Teacher">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => removeTeacherMutation.mutate(section.id)}
                                >
                                  <PersonRemoveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PersonAddIcon />}
                              onClick={() => {
                                setAssignTeacherSection(section);
                                setSelectedTeacherId('');
                              }}
                            >
                              Assign Teacher
                            </Button>
                          )}
                        </TableCell>
                        <TableCell sx={{ width: 220 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={600}>
                              {enrolled} / {capacity} Students
                            </Typography>
                            {isFull && (
                              <Chip label="Full" size="small" color="error" sx={{ height: 18, fontSize: 10 }} />
                            )}
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={percent}
                            color={isFull ? 'error' : percent > 80 ? 'warning' : 'primary'}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={section.status.toUpperCase()}
                            color={section.status === 'active' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Enrolled Students">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setRosterSection(section)}
                            >
                              <GroupIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Assign / Change Teacher">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setAssignTeacherSection(section);
                                setSelectedTeacherId(section.assigned_teacher_id || '');
                              }}
                            >
                              <PersonAddIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Section">
                            <IconButton size="small" onClick={() => onOpenEditSection(section)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={section.status === 'active' ? 'Deactivate Section' : 'Activate Section'}>
                            <IconButton
                              size="small"
                              color={section.status === 'active' ? 'warning' : 'success'}
                              onClick={() => setToggleStatusSection(section)}
                            >
                              {section.status === 'active' ? (
                                <BlockIcon fontSize="small" />
                              ) : (
                                <CheckCircleIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Add Section Dialog */}
          <Dialog open={createSectionOpen} onClose={() => setCreateSectionOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Add Section to {grade.name}</DialogTitle>
            <form onSubmit={handleCreateSubmit(onSubmitCreate)}>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Section Name *"
                      placeholder="e.g. A or 10-A"
                      {...registerCreate('name')}
                      error={Boolean(createErrors.name)}
                      helperText={createErrors.name?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Section Code"
                      placeholder="e.g. SEC-A"
                      {...registerCreate('code')}
                      error={Boolean(createErrors.code)}
                      helperText={createErrors.code?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Maximum Capacity *"
                      {...registerCreate('class_capacity')}
                      error={Boolean(createErrors.class_capacity)}
                      helperText={createErrors.class_capacity?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Initial Class Teacher (Optional)"
                      defaultValue=""
                      {...registerCreate('assigned_teacher_id')}
                      helperText="Teacher responsible for roll call and classroom mentorship."
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
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCreateSectionOpen(false)}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isCreating}>
                  {isCreating ? <CircularProgress size={24} /> : 'Create Section'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {/* Edit Section Dialog */}
          <Dialog open={Boolean(editingSection)} onClose={() => setEditingSection(null)} maxWidth="xs" fullWidth>
            <DialogTitle>Edit Section: {editingSection?.name}</DialogTitle>
            <form onSubmit={handleEditSubmit(onSubmitEdit)}>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Section Name *"
                      {...registerEdit('name')}
                      error={Boolean(editErrors.name)}
                      helperText={editErrors.name?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Section Code"
                      {...registerEdit('code')}
                      error={Boolean(editErrors.code)}
                      helperText={editErrors.code?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Maximum Capacity *"
                      {...registerEdit('class_capacity')}
                      error={Boolean(editErrors.class_capacity)}
                      helperText={editErrors.class_capacity?.message}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditingSection(null)}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isUpdating}>
                  {isUpdating ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {/* Assign / Change Class Teacher Dialog */}
          <Dialog
            open={Boolean(assignTeacherSection)}
            onClose={() => setAssignTeacherSection(null)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>
              {assignTeacherSection?.assigned_teacher_name
                ? `Change Class Teacher for ${assignTeacherSection?.name}`
                : `Assign Class Teacher to ${assignTeacherSection?.name}`}
            </DialogTitle>
            <DialogContent dividers>
              {assignTeacherSection?.assigned_teacher_name && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Current Teacher: <strong>{assignTeacherSection.assigned_teacher_name}</strong>. Reassigning
                  will preserve assignment history with an end date.
                </Typography>
              )}
              <TextField
                fullWidth
                select
                label="Select Teacher *"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
              >
                <MenuItem value="" disabled>
                  Select active teacher...
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
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAssignTeacherSection(null)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={!selectedTeacherId || assignTeacherMutation.isPending}
                onClick={() => {
                  if (assignTeacherSection && selectedTeacherId) {
                    assignTeacherMutation.mutate({
                      sectionId: assignTeacherSection.id,
                      teacherId: selectedTeacherId,
                    });
                  }
                }}
              >
                {assignTeacherMutation.isPending ? <CircularProgress size={24} /> : 'Confirm Assignment'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Enrolled Students Roster Modal */}
          <Dialog
            open={Boolean(rosterSection)}
            onClose={() => setRosterSection(null)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Enrolled Students - Section {rosterSection?.name} ({rosterData?.total_students || 0}{' '}
              Students)
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              {loadingRoster ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : !rosterData?.items || rosterData.items.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No active students enrolled in this section.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Roll No</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Student Code</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Enrollment Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Action
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rosterData.items.map((student) => (
                        <TableRow key={student.enrollment_id} hover>
                          <TableCell>{student.roll_no}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="primary.main">
                              {student.student_code}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={student.status}
                              size="small"
                              color={student.status === 'ACTIVE' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{student.enrollment_date}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Transfer Student to Another Section">
                              <Button
                                size="small"
                                startIcon={<SwapHorizIcon />}
                                onClick={() => setTransferringStudent(student)}
                              >
                                Transfer
                              </Button>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRosterSection(null)}>Close</Button>
            </DialogActions>
          </Dialog>

          {/* Transfer Student Dialog */}
          <Dialog
            open={Boolean(transferringStudent)}
            onClose={() => setTransferringStudent(null)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>
              Transfer {transferringStudent?.first_name} {transferringStudent?.last_name}
            </DialogTitle>
            <form onSubmit={handleTransferSubmit(onSubmitTransfer)}>
              <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Transferring will close the current active enrollment, preserve enrollment history, and assign the student to the new section.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Target Section *"
                      defaultValue=""
                      {...registerTransfer('target_section_id')}
                      error={Boolean(transferErrors.target_section_id)}
                      helperText={transferErrors.target_section_id?.message}
                    >
                      <MenuItem value="" disabled>
                        Select destination section...
                      </MenuItem>
                      {grade.sections
                        ?.filter((s) => s.id !== rosterSection?.id)
                        ?.map((sec) => (
                          <MenuItem key={sec.id} value={sec.id}>
                            Section {sec.name} ({sec.total_students}/{sec.class_capacity || 30})
                          </MenuItem>
                        ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Reason for Transfer (Optional)"
                      placeholder="e.g. Balancing section capacity, parent request..."
                      {...registerTransfer('reason')}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setTransferringStudent(null)}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isTransferring}>
                  {isTransferring ? <CircularProgress size={24} /> : 'Confirm Transfer'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {/* Toggle Section Status Confirmation */}
          <ConfirmDialog
            open={Boolean(toggleStatusSection)}
            title={
              toggleStatusSection?.status === 'active'
                ? `Deactivate Section "${toggleStatusSection?.name}"?`
                : `Activate Section "${toggleStatusSection?.name}"?`
            }
            description={
              toggleStatusSection?.status === 'active'
                ? 'Deactivating this section will prevent assigning new students or teachers.'
                : 'Activating this section will allow new student enrollments.'
            }
            confirmColor={toggleStatusSection?.status === 'active' ? 'error' : 'primary'}
            confirmLabel={toggleStatusSection?.status === 'active' ? 'Deactivate' : 'Activate'}
            loading={toggleSectionStatusMutation.isPending}
            onConfirm={() => {
              if (toggleStatusSection) {
                toggleSectionStatusMutation.mutate({
                  id: toggleStatusSection.id,
                  status: toggleStatusSection.status === 'active' ? 'inactive' : 'active',
                });
              }
            }}
            onClose={() => setToggleStatusSection(null)}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}