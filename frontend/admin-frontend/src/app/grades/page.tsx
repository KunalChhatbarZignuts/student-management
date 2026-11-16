'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { adminTeacherApi } from '@/features/teachers/api';
import { Grade, GradeCreatePayload, GradeUpdatePayload } from '@/features/grades/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

import GradesFilterBar from '@/features/grades/components/GradesFilterBar';
import GradesTable from '@/features/grades/components/GradesTable';
import GradeFormDialog, { GradeFormData } from '@/features/grades/components/GradeFormDialog';

export default function GradesManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  // Filters & Pagination State
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [academicYearId, setAcademicYearId] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Modal States
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingGrade, setEditingGrade] = React.useState<Grade | null>(null);
  const [toggleStatusGrade, setToggleStatusGrade] = React.useState<Grade | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
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

  // Load Paginated Grades
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
  });

  // Mutations
  const createGradeMutation = useMutation({
    mutationFn: (payload: GradeCreatePayload) => adminGradeApi.createGrade(payload),
    onSuccess: () => {
      showSnackbar('Grade created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      setCreateDialogOpen(false);
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

  const handleCreateSubmit = (data: GradeFormData) => {
    createGradeMutation.mutate({
      ...data,
      code: data.code || undefined,
      description: data.description || undefined,
      coordinator_teacher_id: data.coordinator_teacher_id || undefined,
    });
  };

  const handleEditSubmit = (data: GradeFormData) => {
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
              onClick={() => setCreateDialogOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Add Grade
            </Button>
          </Box>

          {/* Filter Bar Subcomponent */}
          <GradesFilterBar
            search={search}
            onSearchChange={setSearch}
            academicYearId={academicYearId}
            onAcademicYearChange={(val) => {
              setAcademicYearId(val);
              setPage(0);
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(val) => {
              setStatusFilter(val);
              setPage(0);
            }}
            academicYears={academicYears}
          />

          {/* Grades Table Subcomponent */}
          <GradesTable
            grades={gradesData?.items || []}
            total={gradesData?.total || 0}
            page={page}
            rowsPerPage={rowsPerPage}
            isLoading={isLoading}
            onPageChange={setPage}
            onRowsPerPageChange={(newRows) => {
              setRowsPerPage(newRows);
              setPage(0);
            }}
            onRowClick={(gradeId) => router.push(`/grades/${gradeId}`)}
            onEdit={setEditingGrade}
            onToggleStatus={setToggleStatusGrade}
          />

          {/* Create Grade Dialog Subcomponent */}
          <GradeFormDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            mode="create"
            defaultAcademicYearId={academicYearId}
            academicYears={academicYears}
            teachers={teachersData?.items || []}
            onSubmit={handleCreateSubmit}
            isSubmitting={createGradeMutation.isPending}
          />

          {/* Edit Grade Dialog Subcomponent */}
          <GradeFormDialog
            open={Boolean(editingGrade)}
            onClose={() => setEditingGrade(null)}
            mode="edit"
            initialGrade={editingGrade}
            academicYears={academicYears}
            teachers={teachersData?.items || []}
            onSubmit={handleEditSubmit}
            isSubmitting={updateGradeMutation.isPending}
          />

          {/* Status Toggle Confirmation Dialog */}
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
