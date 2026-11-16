'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  EnrolledStudentItem,
} from '@/features/grades/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

import GradeHeaderCard from '@/features/grades/components/details/GradeHeaderCard';
import GradeSectionsTable from '@/features/grades/components/details/GradeSectionsTable';
import SectionFormDialog, { SectionFormData } from '@/features/grades/components/details/SectionFormDialog';
import AssignClassTeacherDialog from '@/features/grades/components/details/AssignClassTeacherDialog';
import SectionRosterDialog from '@/features/grades/components/details/SectionRosterDialog';
import StudentSectionTransferDialog, { TransferFormData } from '@/features/grades/components/details/StudentSectionTransferDialog';

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

  // Query Roster
  const { data: rosterData, isLoading: loadingRoster } = useQuery({
    queryKey: ['sections', 'roster', rosterSection?.id],
    queryFn: () => (rosterSection ? adminGradeApi.getSectionStudents(rosterSection.id) : null),
    enabled: Boolean(rosterSection?.id),
  });

  // Mutations
  const createSectionMutation = useMutation({
    mutationFn: (payload: SectionCreatePayload) => adminGradeApi.createSection(payload),
    onSuccess: () => {
      showSnackbar('Section created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
      setCreateSectionOpen(false);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to create section'), 'error'),
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SectionUpdatePayload }) =>
      adminGradeApi.updateSection(id, payload),
    onSuccess: () => {
      showSnackbar('Section details updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
      setEditingSection(null);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to update section'), 'error'),
  });

  const assignTeacherMutation = useMutation({
    mutationFn: ({ sectionId, teacherId }: { sectionId: string; teacherId: string }) =>
      adminGradeApi.assignTeacher(sectionId, teacherId),
    onSuccess: () => {
      showSnackbar('Class Teacher assigned successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
      setAssignTeacherSection(null);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to assign class teacher'), 'error'),
  });

  const removeTeacherMutation = useMutation({
    mutationFn: (sectionId: string) => adminGradeApi.removeTeacher(sectionId),
    onSuccess: () => {
      showSnackbar('Class Teacher removed successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to remove class teacher'), 'error'),
  });

  const transferStudentMutation = useMutation({
    mutationFn: ({
      studentId,
      payload,
    }: {
      studentId: string;
      payload: { target_section_id: string; reason?: string };
    }) => adminGradeApi.transferStudent(studentId, payload),
    onSuccess: () => {
      showSnackbar('Student transferred successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
      if (rosterSection) {
        queryClient.invalidateQueries({ queryKey: ['sections', 'roster', rosterSection.id] });
      }
      setTransferringStudent(null);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to transfer student'), 'error'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (sec: Section) =>
      adminGradeApi.updateSectionStatus(sec.id, sec.status === 'active' ? 'inactive' : 'active'),
    onSuccess: (_, sec) => {
      const action = sec.status === 'active' ? 'deactivated' : 'activated';
      showSnackbar(`Section ${sec.name} ${action} successfully!`, 'success');
      queryClient.invalidateQueries({ queryKey: gradeKeys.detail(gradeId) });
      setToggleStatusSection(null);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to update section status'), 'error'),
  });

  const handleCreateSubmit = (data: SectionFormData) => {
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

  const handleEditSubmit = (data: SectionFormData) => {
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

  const handleTransferSubmit = (data: TransferFormData) => {
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
          <GradeHeaderCard
            grade={grade}
            onAddSection={() => setCreateSectionOpen(true)}
          />

          {/* Sections List */}
          <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
            Sections & Class Teachers
          </Typography>

          <GradeSectionsTable
            sections={grade.sections || []}
            onViewRoster={(sec) => setRosterSection(sec)}
            onAssignTeacher={(sec) => setAssignTeacherSection(sec)}
            onRemoveTeacher={(secId) => removeTeacherMutation.mutate(secId)}
            onEditSection={(sec) => setEditingSection(sec)}
            onToggleStatus={(sec) => setToggleStatusSection(sec)}
          />

          {/* Create Section Dialog */}
          <SectionFormDialog
            open={createSectionOpen}
            onClose={() => setCreateSectionOpen(false)}
            onSubmit={handleCreateSubmit}
            isSubmitting={createSectionMutation.isPending}
            teachers={teachersData?.items || []}
          />

          {/* Edit Section Dialog */}
          <SectionFormDialog
            open={Boolean(editingSection)}
            onClose={() => setEditingSection(null)}
            onSubmit={handleEditSubmit}
            isSubmitting={updateSectionMutation.isPending}
            editingSection={editingSection}
          />

          {/* Assign Class Teacher Modal */}
          <AssignClassTeacherDialog
            section={assignTeacherSection}
            onClose={() => setAssignTeacherSection(null)}
            onAssign={(teacherId) => {
              if (assignTeacherSection) {
                assignTeacherMutation.mutate({
                  sectionId: assignTeacherSection.id,
                  teacherId,
                });
              }
            }}
            isSubmitting={assignTeacherMutation.isPending}
            teachers={teachersData?.items || []}
          />

          {/* Enrolled Students Roster Modal */}
          <SectionRosterDialog
            section={rosterSection}
            onClose={() => setRosterSection(null)}
            rosterData={rosterData}
            isLoading={loadingRoster}
            onTransferStudent={(student) => setTransferringStudent(student)}
          />

          {/* Transfer Student Dialog */}
          <StudentSectionTransferDialog
            student={transferringStudent}
            onClose={() => setTransferringStudent(null)}
            onSubmit={handleTransferSubmit}
            isSubmitting={transferStudentMutation.isPending}
            sections={grade.sections || []}
            currentSectionId={rosterSection?.id}
          />

          {/* Confirm Status Change */}
          {toggleStatusSection && (
            <ConfirmDialog
              open={Boolean(toggleStatusSection)}
              title={`${toggleStatusSection.status === 'active' ? 'Deactivate' : 'Activate'} Section`}
              description={`Are you sure you want to ${
                toggleStatusSection.status === 'active' ? 'deactivate' : 'activate'
              } Section "${toggleStatusSection.name}"?`}
              confirmLabel={toggleStatusSection.status === 'active' ? 'Deactivate' : 'Activate'}
              confirmColor={toggleStatusSection.status === 'active' ? 'error' : 'success'}
              loading={toggleStatusMutation.isPending}
              onConfirm={() => toggleStatusMutation.mutate(toggleStatusSection)}
              onClose={() => setToggleStatusSection(null)}
            />
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
