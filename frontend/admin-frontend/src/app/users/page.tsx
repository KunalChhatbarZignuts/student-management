'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { GridPaginationModel } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import PageHeader from '@/components/ui/PageHeader';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';
import { adminUserApi, userKeys } from '@/features/users/api';
import { adminStudentApi } from '@/features/students/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

import UsersFilterBar from '@/features/users/components/UsersFilterBar';
import UsersTable from '@/features/users/components/UsersTable';
import CreateAdminDialog, { CreateAdminFormData } from '@/features/users/components/CreateAdminDialog';

export default function UsersManagementPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'suspend' | 'activate' | 'password-reset';
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
    role: roleFilter || undefined,
    status: statusFilter || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: userKeys.list(queryParams),
    queryFn: () => adminUserApi.listAllUsers(queryParams),
    placeholderData: keepPreviousData,
  });

  const createAdminMutation = useMutation({
    mutationFn: (payload: CreateAdminFormData) => adminUserApi.createAdmin(payload),
    onSuccess: () => {
      showSnackbar('Administrator account created and invitation dispatched!', 'success');
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      setOpenCreateDialog(false);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to create admin user'), 'error');
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ type, userId }: { type: string; userId: string }) => {
      if (type === 'suspend') return adminStudentApi.suspendUser(userId);
      if (type === 'activate') return adminStudentApi.activateUser(userId);
      if (type === 'password-reset') return adminStudentApi.triggerPasswordReset(userId);
    },
    onSuccess: (_, vars) => {
      showSnackbar(`User action "${vars?.type}" performed successfully!`, 'success');
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      setConfirmAction(null);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to perform user action'), 'error');
    },
  });

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN]}>
      <AppShell>
        <PageHeader
          title="Master Account Management"
          subtitle="Super Admin Control: Oversee all system accounts and provision administrative staff."
          action={
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setOpenCreateDialog(true)}
            >
              Add Administrator
            </Button>
          }
        />

        {/* Filter Controls */}
        <UsersFilterBar
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={(val) => {
            setRoleFilter(val);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
        />

        {/* Data Grid Table */}
        <UsersTable
          items={data?.items || []}
          total={data?.total || 0}
          loading={isLoading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onToggleStatus={(type, userId, userName) =>
            setConfirmAction({ type, userId, userName })
          }
          onPasswordReset={(userId, userName) =>
            setConfirmAction({ type: 'password-reset', userId, userName })
          }
        />

        {/* Create Admin Dialog */}
        <CreateAdminDialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          onSubmit={createAdminMutation.mutate}
          isSubmitting={createAdminMutation.isPending}
        />

        {/* Action Confirmation Modal */}
        {confirmAction && (
          <ConfirmDialog
            open={Boolean(confirmAction)}
            title={`Confirm: ${confirmAction.type.toUpperCase()}`}
            description={`Are you sure you want to perform "${confirmAction.type}" on user account: ${confirmAction.userName}?`}
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
