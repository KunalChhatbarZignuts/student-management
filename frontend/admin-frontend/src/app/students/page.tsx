'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { GridPaginationModel } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import PageHeader from '@/components/ui/PageHeader';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';
import { adminStudentApi, studentKeys } from '@/features/students/api';
import { StudentCreatePayload } from '@/features/students/types';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

import StudentsFilterBar from '@/features/students/components/StudentsFilterBar';
import StudentsTable from '@/features/students/components/StudentsTable';
import CreateStudentDialog from '@/features/students/components/CreateStudentDialog';
import StudentCredentialsDialog, {
  CreatedStudentCredentials,
} from '@/features/students/components/StudentCredentialsDialog';
import EditStudentDialog, { EditStudentFormData } from '@/features/students/components/EditStudentDialog';

export default function StudentsManagementPage() {
  const router = useRouter();
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

  // Academic Structure State for Create Student
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

  // Create Student State & Mutation
  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [createdStudentCredentials, setCreatedStudentCredentials] =
    React.useState<CreatedStudentCredentials | null>(null);

  const createMutation = useMutation({
    mutationFn: async (payload: StudentCreatePayload) => adminStudentApi.createStudent(payload),
    onSuccess: (resData, variables) => {
      const enrollNo = resData?.enrollment_number || resData?.student?.enrollment_number;
      showSnackbar(`Student created successfully! Enrollment Number: ${enrollNo}`, 'success');
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      setOpenCreateDialog(false);
      setEnrollGradeId('');
      setEnrollSectionId('');

      if (resData?.initial_password || variables.password) {
        setCreatedStudentCredentials({
          name: `${resData.student.first_name} ${resData.student.last_name}`,
          enrollmentNumber: enrollNo,
          studentCode: resData.student.student_code,
          email: variables.email,
          password: resData.initial_password || variables.password,
          portalUrl: 'http://localhost:3001/login',
        });
      }
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to create student'), 'error');
    },
  });

  const handleCreateSubmit = (payload: StudentCreatePayload) => {
    if (!enrollYearId || !enrollGradeId || !enrollSectionId) {
      showSnackbar('Academic Year, Grade, and Section are all required!', 'error');
      return;
    }
    createMutation.mutate(payload);
  };

  // Edit Student State & Query
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

  const openEditModal = async (studentItem: any) => {
    try {
      const fullProfile = await adminStudentApi.getStudentProfile(studentItem.id);
      setEditingStudent(fullProfile);
      setEditYearId('');
      setEditGradeId('');
      setEditSectionId('');
    } catch (err) {
      showSnackbar(formatErrorMessage(err, 'Failed to fetch student profile'), 'error');
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({
      formData,
      editYearId: yId,
      editGradeId: gId,
      editSectionId: sId,
    }: {
      formData: EditStudentFormData;
      editYearId: string;
      editGradeId: string;
      editSectionId: string;
    }) => {
      const updateData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        dob: formData.dob,
        department: formData.department,
        guardian_name: formData.guardian_name || null,
        guardian_phone: formData.guardian_phone || null,
        guardian_email: formData.guardian_email || null,
      };
      if (sId) {
        updateData.target_grade_id = gId;
        updateData.target_section_id = sId;
        updateData.target_academic_year_id = yId;
        updateData.transfer_reason = formData.transfer_reason || 'Admin transfer';
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

  // Action Mutations (suspend, activate, resend invite, reset password)
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'suspend' | 'activate' | 'resend-invite' | 'password-reset';
    userId: string;
    userName: string;
  } | null>(null);

  const actionMutation = useMutation({
    mutationFn: async ({ type, userId }: { type: string; userId: string }) => {
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
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      setConfirmAction(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to perform action'), 'error');
    },
  });

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <PageHeader
          title="Students Directory"
          subtitle="Manage student enrollment, generate server-issued student codes, and administer account states."
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
            >
              Create Student
            </Button>
          }
        />

        {/* Search & Filters */}
        <StudentsFilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
        />

        {/* Data Table */}
        <StudentsTable
          items={data?.items || []}
          total={data?.total || 0}
          loading={isLoading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onView={(studentId) => router.push(`/students/${studentId}`)}
          onEdit={openEditModal}
          onResendInvite={(userId, userName) =>
            setConfirmAction({ type: 'resend-invite', userId, userName })
          }
          onToggleStatus={(type, userId, userName) =>
            setConfirmAction({ type, userId, userName })
          }
          onPasswordReset={(userId, userName) =>
            setConfirmAction({ type: 'password-reset', userId, userName })
          }
        />

        {/* Create Student Modal */}
        <CreateStudentDialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          onSubmit={handleCreateSubmit}
          isSubmitting={createMutation.isPending}
          academicYears={academicYears}
          enrollYearId={enrollYearId}
          onYearChange={(yearId) => {
            setEnrollYearId(yearId);
            setEnrollGradeId('');
            setEnrollSectionId('');
          }}
          gradesList={gradesList}
          enrollGradeId={enrollGradeId}
          onGradeChange={(gradeId) => {
            setEnrollGradeId(gradeId);
            setEnrollSectionId('');
          }}
          sectionsList={sectionsList}
          enrollSectionId={enrollSectionId}
          onSectionChange={setEnrollSectionId}
        />

        {/* Student Credentials Modal */}
        <StudentCredentialsDialog
          credentials={createdStudentCredentials}
          onClose={() => setCreatedStudentCredentials(null)}
        />

        {/* Edit Student & Academic Transfer Modal */}
        <EditStudentDialog
          editingStudent={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSubmit={updateMutation.mutate}
          isSubmitting={updateMutation.isPending}
          academicYears={academicYears}
          editYearId={editYearId}
          onEditYearChange={(yId) => {
            setEditYearId(yId);
            setEditGradeId('');
            setEditSectionId('');
          }}
          editGradeId={editGradeId}
          onEditGradeChange={(gId) => {
            setEditGradeId(gId);
            setEditSectionId('');
          }}
          editSectionId={editSectionId}
          onEditSectionChange={setEditSectionId}
          editGradesList={editGradesList}
          loadingEditGrades={loadingEditGrades}
          editSectionsList={editSectionsList}
          loadingEditSections={loadingEditSections}
        />

        {/* Confirmation Dialog */}
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
