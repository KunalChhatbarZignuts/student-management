'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AddIcon from '@mui/icons-material/Add';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PeopleIcon from '@mui/icons-material/People';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { GridPaginationModel } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import PageHeader from '@/components/ui/PageHeader';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';
import { adminTeacherApi, teacherKeys } from '@/features/teachers/api';
import { adminStudentApi } from '@/features/students/api';
import { TeacherCreatePayload } from '@/features/teachers/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

import SubjectAssignmentsTab from '@/features/teachers/components/SubjectAssignmentsTab';
import AssignSubjectDialog from '@/features/teachers/components/AssignSubjectDialog';
import TeacherProfileDialog from '@/features/teachers/components/TeacherProfileDialog';
import SubjectsTab from '@/features/teachers/components/SubjectsTab';
import TeachersFilterBar from '@/features/teachers/components/TeachersFilterBar';
import TeachersTable from '@/features/teachers/components/TeachersTable';
import CreateTeacherDialog from '@/features/teachers/components/CreateTeacherDialog';

export default function TeachersManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [activeTab, setActiveTab] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [selectedTeacherIdForSubject, setSelectedTeacherIdForSubject] = React.useState<string | null>(null);
  const [selectedTeacherIdForProfile, setSelectedTeacherIdForProfile] = React.useState<string | null>(null);
  const [teacherToDelete, setTeacherToDelete] = React.useState<{
    id: string;
    name: string;
    employee_code?: string;
  } | null>(null);
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

  const createMutation = useMutation({
    mutationFn: (payload: TeacherCreatePayload) => adminTeacherApi.createTeacher(payload),
    onSuccess: () => {
      showSnackbar('Teacher created successfully and invitation sent!', 'success');
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
      setOpenCreateDialog(false);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to create teacher account'), 'error');
    },
  });

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
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
      setConfirmAction(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to execute action'), 'error');
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: (teacherId: string) => adminTeacherApi.deleteTeacher(teacherId),
    onSuccess: () => {
      showSnackbar('Faculty member and active assignments deactivated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
      setTeacherToDelete(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to deactivate teacher'), 'error');
    },
  });

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab icon={<PeopleIcon />} iconPosition="start" label="Faculty Directory" />
            <Tab icon={<MenuBookIcon />} iconPosition="start" label="Subject Assignments Matrix" />
            <Tab icon={<LibraryBooksIcon />} iconPosition="start" label="Curriculum Subjects" />
          </Tabs>

          {activeTab === 0 ? (
            <>
              <PageHeader
                title="Faculty & Teachers Directory"
                subtitle="Manage instructors, server-generated employee codes, and assign department roles."
                action={
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenCreateDialog(true)}
                  >
                    Create Teacher
                  </Button>
                }
              />

              <TeachersFilterBar
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusFilterChange={(val) => {
                  setStatusFilter(val);
                  setPaginationModel((prev) => ({ ...prev, page: 0 }));
                }}
              />

              <TeachersTable
                items={data?.items || []}
                total={data?.total || 0}
                loading={isLoading}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                onView={(teacherId) => router.push(`/teachers/${teacherId}`)}
                onViewProfile={(teacherId) => setSelectedTeacherIdForProfile(teacherId)}
                onAssignSubject={(teacherId) => setSelectedTeacherIdForSubject(teacherId)}
                onResendInvite={(userId, userName) =>
                  setConfirmAction({ type: 'resend-invite', userId, userName })
                }
                onToggleStatus={(type, userId, userName) =>
                  setConfirmAction({ type, userId, userName })
                }
                onPasswordReset={(userId, userName) =>
                  setConfirmAction({ type: 'password-reset', userId, userName })
                }
                onDeactivate={(teacher) => setTeacherToDelete(teacher)}
              />
            </>
          ) : activeTab === 1 ? (
            <SubjectAssignmentsTab />
          ) : (
            <SubjectsTab />
          )}
        </Box>

        {/* Create Teacher Modal */}
        <CreateTeacherDialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          onSubmit={createMutation.mutate}
          isSubmitting={createMutation.isPending}
        />

        {/* Assign Subject Dialog */}
        {selectedTeacherIdForSubject && (
          <AssignSubjectDialog
            open={Boolean(selectedTeacherIdForSubject)}
            initialTeacherId={selectedTeacherIdForSubject}
            onClose={() => setSelectedTeacherIdForSubject(null)}
          />
        )}

        {/* Profile Dialog */}
        {selectedTeacherIdForProfile && (
          <TeacherProfileDialog
            open={Boolean(selectedTeacherIdForProfile)}
            teacherId={selectedTeacherIdForProfile}
            onClose={() => setSelectedTeacherIdForProfile(null)}
          />
        )}

        {/* Status / Password Action Confirmation */}
        {confirmAction && (
          <ConfirmDialog
            open={Boolean(confirmAction)}
            title={`Confirm: ${confirmAction.type.toUpperCase()}`}
            description={`Are you sure you want to perform "${confirmAction.type}" on instructor account: ${confirmAction.userName}?`}
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

        {/* Teacher Deactivation Confirmation */}
        {teacherToDelete && (
          <ConfirmDialog
            open={Boolean(teacherToDelete)}
            title="Deactivate Faculty Member"
            description={`Are you sure you want to deactivate faculty member "${teacherToDelete.name}" (${teacherToDelete.employee_code || 'No code'})? This will mark the instructor as inactive and release active subject allocations.`}
            confirmLabel="Deactivate Faculty"
            confirmColor="error"
            loading={deleteTeacherMutation.isPending}
            onConfirm={() => deleteTeacherMutation.mutate(teacherToDelete.id)}
            onClose={() => setTeacherToDelete(null)}
          />
        )}
      </AppShell>
    </RequireRole>
  );
}
