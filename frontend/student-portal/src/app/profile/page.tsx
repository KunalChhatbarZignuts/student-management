'use client';

import * as React from 'react';
import Box from '@mui/material/Box';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/features/auth/hooks';
import { useMyStudentProfile } from '@/features/students/hooks';
import { useParentProfile, useUpdateParentProfile } from '@/features/parents/hooks';
import { ParentProfileUpdate } from '@/features/parents/types';
import { ROLES, STUDENT_PORTAL_ALLOWED_ROLES } from '@/lib/constants';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import {
  StudentProfileCard,
  ParentProfileCard,
  ProfileSecurityCard,
  EditParentProfileDialog,
} from '@/features/students/components';

export default function ProfilePage() {
  const { user, role, logout } = useAuth();
  const { data: student } = useMyStudentProfile();
  const { data: parentProfile } = useParentProfile();
  const updateParentMutation = useUpdateParentProfile();
  const { showSnackbar } = useSnackbar();

  const [confirmLogoutAll, setConfirmLogoutAll] = React.useState(false);
  const [openEditParent, setOpenEditParent] = React.useState(false);

  const isStudent = role === ROLES.STUDENT;
  const isParent = role === ROLES.PARENT;

  const handleSaveParentProfile = async (formData: ParentProfileUpdate) => {
    try {
      await updateParentMutation.mutateAsync(formData);
      showSnackbar('Profile details updated successfully', 'success');
      setOpenEditParent(false);
    } catch {
      showSnackbar('Failed to update profile details', 'error');
    }
  };

  const handleLogoutAll = async () => {
    setConfirmLogoutAll(false);
    showSnackbar('Logged out from all sessions', 'info');
    await logout();
  };

  return (
    <RequireRole roles={STUDENT_PORTAL_ALLOWED_ROLES}>
      <AppShell>
        <Box sx={{ maxWidth: 860, mx: 'auto' }}>
          <PageHeader
            title="My Profile"
            subtitle="Review personal information, enrollment details, and security preferences."
          />

          {/* Student Profile Card */}
          {isStudent && (
            <StudentProfileCard
              user={user}
              student={student}
              role={role}
            />
          )}

          {/* Parent Profile Card */}
          {isParent && (
            <ParentProfileCard
              user={user}
              parentProfile={parentProfile}
              role={role}
              onEditClick={() => setOpenEditParent(true)}
            />
          )}

          {/* Security & Password Settings */}
          <ProfileSecurityCard
            onLogoutAllClick={() => setConfirmLogoutAll(true)}
          />
        </Box>

        <ConfirmDialog
          open={confirmLogoutAll}
          title="Log Out from All Devices?"
          description="This will terminate all active login sessions across your browser tabs, mobile devices, and computers."
          confirmLabel="Log Out Everywhere"
          confirmColor="error"
          onConfirm={handleLogoutAll}
          onClose={() => setConfirmLogoutAll(false)}
        />

        {/* Edit Parent Profile Dialog */}
        {isParent && (
          <EditParentProfileDialog
            open={openEditParent}
            onClose={() => setOpenEditParent(false)}
            email={user?.email}
            initialValues={{
              first_name: parentProfile?.first_name || '',
              last_name: parentProfile?.last_name || '',
              phone: parentProfile?.phone || '',
              address: parentProfile?.address || '',
            }}
            onSave={handleSaveParentProfile}
            isSaving={updateParentMutation.isPending}
          />
        )}
      </AppShell>
    </RequireRole>
  );
}
