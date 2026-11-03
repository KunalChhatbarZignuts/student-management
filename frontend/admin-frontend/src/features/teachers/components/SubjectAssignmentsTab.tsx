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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import MenuBookIcon from '@mui/icons-material/MenuBook';

import { teacherSubjectApi, teacherSubjectKeys } from '../subjectApi';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { adminTeacherApi, teacherKeys } from '../api';
import { TeacherSubjectItem } from '../types';
import AssignSubjectDialog from './AssignSubjectDialog';
import CreateSubjectDialog from './CreateSubjectDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

export default function SubjectAssignmentsTab() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  // Filters state
  const [teacherFilter, setTeacherFilter] = React.useState('');
  const [subjectFilter, setSubjectFilter] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState('');
  const [sectionFilter, setSectionFilter] = React.useState('');
  const [academicYearFilter, setAcademicYearFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });

  // Dialogs
  const [openAssignDialog, setOpenAssignDialog] = React.useState(false);
  const [openCreateSubjectDialog, setOpenCreateSubjectDialog] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<TeacherSubjectItem | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<TeacherSubjectItem | null>(null);

  // Edit Form State
  const [editGradeId, setEditGradeId] = React.useState('');
  const [editSectionId, setEditSectionId] = React.useState('');
  const [editAcademicYearId, setEditAcademicYearId] = React.useState('');
  const [editStatus, setEditStatus] = React.useState('active');

  // Query filters payload
  const queryParams = {
    teacher_id: teacherFilter || undefined,
    subject_id: subjectFilter || undefined,
    grade_id: gradeFilter || undefined,
    section_id: sectionFilter || undefined,
    academic_year_id: academicYearFilter || undefined,
    status: statusFilter || undefined,
    skip: paginationModel.page * paginationModel.pageSize,
    limit: paginationModel.pageSize,
  };

  const { data: assignments, isLoading, error } = useQuery({
    queryKey: teacherSubjectKeys.overview(queryParams),
    queryFn: () => teacherSubjectApi.listOverview(queryParams),
  });

  // Dropdown reference data
  const { data: teachersData } = useQuery({
    queryKey: teacherKeys.list({ limit: 100 }),
    queryFn: () => adminTeacherApi.listTeachers({ limit: 100 }),
  });

  const { data: subjects } = useQuery({
    queryKey: teacherSubjectKeys.subjects(),
    queryFn: teacherSubjectApi.listSubjects,
  });

  const { data: academicYears } = useQuery({
    queryKey: gradeKeys.academicYears,
    queryFn: adminGradeApi.listAcademicYears,
  });

  const { data: gradesData } = useQuery({
    queryKey: gradeKeys.list({ size: 100, academic_year_id: academicYearFilter || undefined }),
    queryFn: () => adminGradeApi.listGrades({ size: 100, academic_year_id: academicYearFilter || undefined }),
  });

  const { data: filterSections } = useQuery({
    queryKey: gradeKeys.sections(gradeFilter),
    queryFn: () => adminGradeApi.getGradeSections(gradeFilter),
    enabled: Boolean(gradeFilter),
  });

  const { data: editSections } = useQuery({
    queryKey: gradeKeys.sections(editGradeId),
    queryFn: () => adminGradeApi.getGradeSections(editGradeId),
    enabled: Boolean(editGradeId),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      teacherSubjectApi.updateAssignment(id, payload),
    onSuccess: () => {
      showSnackbar('Subject assignment updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: teacherSubjectKeys.all });
      setEditingItem(null);
    },
    onError: (err: any) => {
      showSnackbar(formatErrorMessage(err), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: string; hardDelete?: boolean }) =>
      teacherSubjectApi.deleteAssignment(id, hardDelete),
    onSuccess: () => {
      showSnackbar('Assignment deactivated/removed successfully', 'success');
      queryClient.invalidateQueries({ queryKey: teacherSubjectKeys.all });
      setConfirmDelete(null);
    },
    onError: (err: any) => {
      showSnackbar(formatErrorMessage(err), 'error');
    },
  });

  const handleOpenEdit = (item: TeacherSubjectItem) => {
    setEditingItem(item);
    setEditGradeId(item.grade_id || '');
    setEditSectionId(item.section_id || '');
    setEditAcademicYearId(item.academic_year_id || '');
    setEditStatus(item.status);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateMutation.mutate({
      id: editingItem.id,
      payload: {
        grade_id: editGradeId || null,
        section_id: editSectionId || null,
        academic_year_id: editAcademicYearId || null,
        status: editStatus,
      },
    });
  };

  const handleToggleStatus = (item: TeacherSubjectItem) => {
    const nextStatus = item.status === 'active' ? 'inactive' : 'active';
    updateMutation.mutate({
      id: item.id,
      payload: { status: nextStatus },
    });
  };

  const handleResetFilters = () => {
    setTeacherFilter('');
    setSubjectFilter('');
    setGradeFilter('');
    setSectionFilter('');
    setAcademicYearFilter('');
    setStatusFilter('');
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const columns: GridColDef<TeacherSubjectItem>[] = [
    {
      field: 'teacher_name',
      headerName: 'Teacher',
      flex: 1.2,
      minWidth: 170,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {params.row.teacher_name || 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.teacher_employee_code || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'subject_name',
      headerName: 'Subject',
      flex: 1.2,
      minWidth: 160,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {params.row.subject_name || 'Subject'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Code: {params.row.subject_code || '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'grade_name',
      headerName: 'Grade & Section',
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.grade_name || 'All Grades'}
          {params.row.section_name ? ` (Sec ${params.row.section_name})` : ''}
        </Typography>
      ),
    },
    {
      field: 'academic_year_name',
      headerName: 'Academic Year',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.row.academic_year_name || 'Any'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.row.status}
          color={params.row.status === 'active' ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit Assignment Scope">
            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.status === 'active' ? 'Deactivate' : 'Activate'}>
            <IconButton
              size="small"
              color={params.row.status === 'active' ? 'warning' : 'success'}
              onClick={() => handleToggleStatus(params.row)}
            >
              {params.row.status === 'active' ? (
                <BlockIcon fontSize="small" />
              ) : (
                <CheckCircleOutlineIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove Assignment">
            <IconButton
              size="small"
              color="error"
              onClick={() => setConfirmDelete(params.row)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Top action header */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Subject Assignments Matrix
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Assign curriculum subjects to teachers across Grades, Sections, and Academic Years.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<MenuBookIcon />}
            onClick={() => setOpenCreateSubjectDialog(true)}
          >
            Create New Subject
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAssignDialog(true)}
          >
            Assign Subject(s)
          </Button>
        </Box>
      </Box>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              select
              fullWidth
              size="small"
              label="Teacher"
              value={teacherFilter}
              onChange={(e) => {
                setTeacherFilter(e.target.value);
                setPaginationModel((p) => ({ ...p, page: 0 }));
              }}
            >
              <MenuItem value="">All Teachers</MenuItem>
              {teachersData?.items?.map((u: any) => {
                const t = u.teacher;
                if (!t) return null;
                return (
                  <MenuItem key={t.id} value={t.id}>
                    {t.first_name} {t.last_name} ({t.employee_code || '-'})
                  </MenuItem>
                );
              })}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Subject"
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setPaginationModel((p) => ({ ...p, page: 0 }));
              }}
            >
              <MenuItem value="">All Subjects</MenuItem>
              {subjects?.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Grade"
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                setSectionFilter('');
                setPaginationModel((p) => ({ ...p, page: 0 }));
              }}
            >
              <MenuItem value="">All Grades</MenuItem>
              {gradesData?.items?.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Section"
              value={sectionFilter}
              onChange={(e) => {
                setSectionFilter(e.target.value);
                setPaginationModel((p) => ({ ...p, page: 0 }));
              }}
              disabled={!gradeFilter}
            >
              <MenuItem value="">All Sections</MenuItem>
              {filterSections?.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  Section {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Academic Year"
              value={academicYearFilter}
              onChange={(e) => {
                setAcademicYearFilter(e.target.value);
                setPaginationModel((p) => ({ ...p, page: 0 }));
              }}
            >
              <MenuItem value="">All Terms</MenuItem>
              {academicYears?.map((ay) => (
                <MenuItem key={ay.id} value={ay.id}>
                  {ay.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={1.5}>
            <Button
              variant="outlined"
              color="inherit"
              fullWidth
              startIcon={<FilterAltOffIcon />}
              onClick={handleResetFilters}
              size="medium"
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Assignments Table */}
      <Paper sx={{ height: 560, width: '100%', borderRadius: 2 }}>
        <DataGrid
          rows={assignments || []}
          columns={columns}
          loading={isLoading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 15, 25, 50]}
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
          sx={{ border: 0 }}
        />
      </Paper>

      {/* Assign Subject Dialog */}
      <AssignSubjectDialog
        open={openAssignDialog}
        onClose={() => setOpenAssignDialog(false)}
      />

      {/* Create Subject Dialog */}
      <CreateSubjectDialog
        open={openCreateSubjectDialog}
        onClose={() => setOpenCreateSubjectDialog(false)}
      />

      {/* Edit Assignment Scope Dialog */}
      <Dialog open={Boolean(editingItem)} onClose={() => setEditingItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Subject Assignment Scope</DialogTitle>
        <DialogContent dividers>
          {editingItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Alert severity="info">
                Editing assignment for <b>{editingItem.teacher_name}</b> &mdash; <b>{editingItem.subject_name}</b>
              </Alert>

              <TextField
                select
                fullWidth
                size="small"
                label="Academic Year"
                value={editAcademicYearId}
                onChange={(e) => setEditAcademicYearId(e.target.value)}
              >
                <MenuItem value="">None / All Terms</MenuItem>
                {academicYears?.map((ay) => (
                  <MenuItem key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_current ? '(Current)' : ''}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                size="small"
                label="Grade"
                value={editGradeId}
                onChange={(e) => {
                  setEditGradeId(e.target.value);
                  setEditSectionId('');
                }}
              >
                <MenuItem value="">None / All Grades</MenuItem>
                {gradesData?.items?.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                size="small"
                label="Section"
                value={editSectionId}
                onChange={(e) => setEditSectionId(e.target.value)}
                disabled={!editGradeId}
              >
                <MenuItem value="">None / All Sections</MenuItem>
                {editSections?.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    Section {s.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditingItem(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete / Deactivate Confirmation */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Remove Subject Assignment"
        description={
          confirmDelete
            ? `Are you sure you want to deactivate/remove the assignment of ${confirmDelete.subject_name} for ${confirmDelete.teacher_name}?`
            : ''
        }
        confirmLabel="Remove Assignment"
        confirmColor="error"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (confirmDelete) {
            deleteMutation.mutate({ id: confirmDelete.id, hardDelete: false });
          }
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </Box>
  );
}
