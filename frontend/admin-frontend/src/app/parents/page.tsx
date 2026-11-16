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
import {
  adminParentApi,
  parentKeys,
  ParentWithChildren,
  LinkedChildDetail,
} from '@/features/parents/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

import ParentsFilterBar from '@/features/parents/components/ParentsFilterBar';
import ParentsTable from '@/features/parents/components/ParentsTable';
import CreateParentDialog, { CreateParentFormData } from '@/features/parents/components/CreateParentDialog';
import EditParentDialog, { EditParentFormData } from '@/features/parents/components/EditParentDialog';
import LinkChildDialog from '@/features/parents/components/LinkChildDialog';
import ParentDetailDialog from '@/features/parents/components/ParentDetailDialog';
import ParentCredentialsDialog, {
  CreatedParentCredentials,
} from '@/features/parents/components/ParentCredentialsDialog';

export default function ParentsPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  // Search & Pagination state
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

  // Dialog states
  const [openCreate, setOpenCreate] = React.useState(false);
  const [editingParent, setEditingParent] = React.useState<ParentWithChildren | null>(null);
  const [viewingParent, setViewingParent] = React.useState<ParentWithChildren | null>(null);
  const [linkingParent, setLinkingParent] = React.useState<ParentWithChildren | null>(null);
  const [createdCredentials, setCreatedCredentials] =
    React.useState<CreatedParentCredentials | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'suspend' | 'activate' | 'resend-invite' | 'unlink-child';
    targetId: string;
    extraId?: string;
    targetName: string;
  } | null>(null);

  // Query parents
  const queryParams = {
    skip: paginationModel.page * paginationModel.pageSize,
    limit: paginationModel.pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: parentKeys.list(queryParams),
    queryFn: () => adminParentApi.listParents(queryParams),
    placeholderData: keepPreviousData,
  });

  // Query unlinked students available for linking (enforcing 1-parent per student profile)
  const { data: availableStudents = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['parents', 'available-students'],
    queryFn: () => adminParentApi.getAvailableStudents(),
    enabled: Boolean(linkingParent),
  });

  const studentOptions = availableStudents.map((s) => ({
    id: s.id,
    label: s.label || `${s.first_name} ${s.last_name} (${s.enrollment_number || s.student_code}) - ${s.class_name || 'Class'} (${s.section || 'A'})`,
  }));

  // Create Parent Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateParentFormData) => adminParentApi.createParent(payload),
    onSuccess: (res) => {
      showSnackbar('Parent account created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      setOpenCreate(false);
      if (res.initial_password) {
        setCreatedCredentials({
          name: `${res.first_name} ${res.last_name}`,
          identifier: res.email,
          phone: res.phone || undefined,
          password: res.initial_password,
          portalUrl: 'http://localhost:3001/login',
        });
      }
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to create parent'), 'error'),
  });

  // Update Parent Mutation
  const updateMutation = useMutation({
    mutationFn: (payload: EditParentFormData) => {
      if (!editingParent) throw new Error('No parent selected');
      return adminParentApi.updateParent(editingParent.id, payload);
    },
    onSuccess: () => {
      showSnackbar('Parent details updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      setEditingParent(null);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to update parent'), 'error'),
  });

  // Link Child Mutation
  const linkMutation = useMutation({
    mutationFn: async (linkData: {
      studentId: string;
      relationshipType: string;
      isPrimaryGuardian: boolean;
    }) => {
      if (!linkingParent) throw new Error('Parent is required');
      return adminParentApi.linkChild(linkingParent.id, {
        student_id: linkData.studentId,
        relationship_type: linkData.relationshipType,
        is_primary_guardian: linkData.isPrimaryGuardian,
      });
    },
    onSuccess: () => {
      showSnackbar('Child linked to parent guardian record successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      setLinkingParent(null);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to link child'), 'error'),
  });

  // Action Mutation (suspend, activate, resend-invite, unlink-child)
  const actionMutation = useMutation({
    mutationFn: async (action: { type: string; targetId: string; extraId?: string }) => {
      if (action.type === 'suspend') {
        return adminParentApi.updateParentStatus(action.targetId, 'suspended');
      } else if (action.type === 'activate') {
        return adminParentApi.updateParentStatus(action.targetId, 'active');
      } else if (action.type === 'resend-invite') {
        return adminParentApi.resendInvite(action.targetId);
      } else if (action.type === 'unlink-child' && action.extraId) {
        return adminParentApi.unlinkChild(action.targetId, action.extraId);
      }
    },
    onSuccess: (_, variables) => {
      const msg =
        variables.type === 'unlink-child'
          ? 'Child unlinked from parent record successfully'
          : `Parent action ${variables.type} completed successfully!`;
      showSnackbar(msg, 'success');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      setConfirmAction(null);
      if (viewingParent) {
        adminParentApi.getParent(viewingParent.id).then((fresh) => setViewingParent(fresh));
      }
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Action failed'), 'error'),
  });

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <PageHeader
          title="Parents & Guardians Directory"
          subtitle="Manage parent accounts, configure parent-student relationship linkages, and dispatch portal invites."
          action={
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setOpenCreate(true)}
            >
              Add Parent
            </Button>
          }
        />

        {/* Search & Status Filters */}
        <ParentsFilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
          }}
        />

        {/* Parents Data Table */}
        <ParentsTable
          items={data?.items || []}
          total={data?.total || 0}
          loading={isLoading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onView={(p) => setViewingParent(p)}
          onEdit={(p) => setEditingParent(p)}
          onLink={(p) => setLinkingParent(p)}
          onResendInvite={(targetId, targetName) =>
            setConfirmAction({ type: 'resend-invite', targetId, targetName })
          }
          onToggleStatus={(type, targetId, targetName) =>
            setConfirmAction({ type, targetId, targetName })
          }
        />

        {/* Create Parent Dialog */}
        <CreateParentDialog
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onSubmit={createMutation.mutate}
          isSubmitting={createMutation.isPending}
        />

        {/* Edit Parent Dialog */}
        <EditParentDialog
          editingParent={editingParent}
          onClose={() => setEditingParent(null)}
          onSubmit={updateMutation.mutate}
          isSubmitting={updateMutation.isPending}
        />

        {/* Link Child Modal */}
        <LinkChildDialog
          linkingParent={linkingParent}
          onClose={() => setLinkingParent(null)}
          onSubmit={linkMutation.mutate}
          isSubmitting={linkMutation.isPending}
          studentOptions={studentOptions}
          isLoadingStudents={isLoadingStudents}
        />

        {/* View Details & Linked Children Modal */}
        <ParentDetailDialog
          viewingParent={viewingParent}
          onClose={() => setViewingParent(null)}
          onLinkNewChild={(p) => setLinkingParent(p)}
          onUnlinkChild={(p, child) =>
            setConfirmAction({
              type: 'unlink-child',
              targetId: p.id,
              extraId: child.student_id,
              targetName: `${child.first_name} ${child.last_name}`,
            })
          }
        />

        {/* Credentials Created Dialog */}
        <ParentCredentialsDialog
          credentials={createdCredentials}
          onClose={() => setCreatedCredentials(null)}
        />

        {/* Confirmation Dialog */}
        {confirmAction && (
          <ConfirmDialog
            open={Boolean(confirmAction)}
            title={`Confirm: ${confirmAction.type.toUpperCase()}`}
            description={
              confirmAction.type === 'unlink-child'
                ? `Are you sure you want to unlink student "${confirmAction.targetName}" from this parent profile?`
                : `Are you sure you want to perform "${confirmAction.type}" on parent account: ${confirmAction.targetName}?`
            }
            confirmLabel="Confirm Action"
            confirmColor={confirmAction.type === 'suspend' || confirmAction.type === 'unlink-child' ? 'error' : 'primary'}
            loading={actionMutation.isPending}
            onConfirm={() =>
              actionMutation.mutate({
                type: confirmAction.type,
                targetId: confirmAction.targetId,
                extraId: confirmAction.extraId,
              })
            }
            onClose={() => setConfirmAction(null)}
          />
        )}
      </AppShell>
    </RequireRole>
  );
}
