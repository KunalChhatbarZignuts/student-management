'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete from '@mui/material/Autocomplete';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { adminParentApi, parentKeys, ParentWithChildren } from '@/features/parents/api';
import { adminStudentApi } from '@/features/students/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

const createParentSchema = z.object({
  email: z.string().email('Valid email is required').trim().toLowerCase(),
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().optional(),
});

type CreateParentFormData = z.infer<typeof createParentSchema>;

export default function ParentLinkingPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  // Selection states for linking
  const [selectedParent, setSelectedParent] = React.useState<ParentWithChildren | null>(null);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);

  // Queries
  const { data: parents, isLoading: loadingParents } = useQuery({
    queryKey: parentKeys.list(),
    queryFn: adminParentApi.listParents,
  });

  const { data: studentData, isLoading: loadingStudents } = useQuery({
    queryKey: ['students', 'for-linking'],
    queryFn: () => adminStudentApi.listStudents({ limit: 100 }),
  });

  const enrolledStudents = (studentData?.items || [])
    .filter((u) => u.student)
    .map((u) => ({
      id: u.student!.id,
      label: `${u.student!.first_name} ${u.student!.last_name} (${u.student!.student_code}) - ${u.student!.class_name}`,
    }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateParentFormData>({
    resolver: zodResolver(createParentSchema),
  });

  const createParentMutation = useMutation({
    mutationFn: (payload: CreateParentFormData) => adminParentApi.createParent(payload),
    onSuccess: (data) => {
      showSnackbar(`Parent account created successfully!`, 'success');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      reset();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to create parent'), 'error');
    },
  });

  const linkMutation = useMutation({
    mutationFn: () => {
      if (!selectedParent || !selectedStudentId) throw new Error('Parent and student must be selected');
      return adminParentApi.linkStudent(selectedParent.id, selectedStudentId);
    },
    onSuccess: () => {
      showSnackbar('Student linked to parent successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      setSelectedStudentId(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to link parent and student'), 'error');
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: string; studentId: string }) =>
      adminParentApi.unlinkStudent(parentId, studentId),
    onSuccess: () => {
      showSnackbar('Student unlinked from parent.', 'info');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to unlink student'), 'error');
    },
  });

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Parent & Guardian Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Provision parent accounts and establish verified family relationships with enrolled students.
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Create Parent Form */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <PersonAddIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    1. Create Parent Account
                  </Typography>
                </Box>

                <Box component="form" onSubmit={handleSubmit((d) => createParentMutation.mutate(d))} noValidate>
                  <TextField
                    margin="normal"
                    fullWidth
                    label="Parent Email"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    {...register('email')}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    label="First Name"
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message}
                    {...register('first_name')}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    label="Last Name"
                    error={!!errors.last_name}
                    helperText={errors.last_name?.message}
                    {...register('last_name')}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    label="Phone Number (Optional)"
                    {...register('phone')}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ mt: 3 }}
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
                  >
                    {isSubmitting ? 'Creating...' : 'Create & Invite Parent'}
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Link Parent to Student Form */}
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <LinkIcon color="secondary" />
                  <Typography variant="h6" fontWeight={700}>
                    2. Link to Enrolled Student
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Select a parent account and an enrolled student to grant the guardian access to academic records.
                </Typography>

                <Autocomplete
                  options={parents || []}
                  getOptionLabel={(p) => `${p.first_name} ${p.last_name} (${p.email})`}
                  value={selectedParent}
                  onChange={(_, val) => setSelectedParent(val)}
                  loading={loadingParents}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Parent Account" margin="normal" fullWidth />
                  )}
                  sx={{ mb: 2 }}
                />

                <Autocomplete
                  options={enrolledStudents}
                  getOptionLabel={(s) => s.label}
                  value={enrolledStudents.find((s) => s.id === selectedStudentId) || null}
                  onChange={(_, val) => setSelectedStudentId(val ? val.id : null)}
                  loading={loadingStudents}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Enrolled Student" margin="normal" fullWidth />
                  )}
                />

                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  sx={{ mt: 3 }}
                  disabled={linkMutation.isPending || !selectedParent || !selectedStudentId}
                  onClick={() => linkMutation.mutate()}
                  startIcon={linkMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {linkMutation.isPending ? 'Linking...' : 'Link Parent & Student'}
                </Button>
              </Paper>
            </Grid>
          </Grid>

          {/* Current Parent Links Table */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <FamilyRestroomIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Current Parent Directory & Linked Students
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Parent Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Linked Children</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingParents ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Loading parent links...
                      </TableCell>
                    </TableRow>
                  ) : !parents || parents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        No parents found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    parents.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {p.first_name} {p.last_name}
                        </TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell>{p.phone || '-'}</TableCell>
                        <TableCell>
                          {p.children.length === 0 ? (
                            <Typography variant="caption" color="text.secondary">
                              No children linked
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {p.children.map((c) => (
                                <Chip
                                  key={c.id}
                                  label={`${c.first_name} (${c.student_code})`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  onDelete={() =>
                                    unlinkMutation.mutate({
                                      parentId: p.id,
                                      studentId: c.id,
                                    })
                                  }
                                />
                              ))}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedParent(p)}
                          >
                            Select for Link
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
