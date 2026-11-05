'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PaymentsIcon from '@mui/icons-material/Payments';
import EditIcon from '@mui/icons-material/Edit';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { ROLES } from '@/lib/constants';
import { adminStudentApi, studentKeys } from '@/features/students/api';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';
import { StudentUpdatePayload } from '@/features/students/types';

import StudentHeaderCard from '@/features/students/components/details/StudentHeaderCard';
import StudentOverviewTab from '@/features/students/components/details/StudentOverviewTab';
import StudentAcademicsTab from '@/features/students/components/details/StudentAcademicsTab';
import StudentParentsTab from '@/features/students/components/details/StudentParentsTab';
import StudentAdmissionsTab from '@/features/students/components/details/StudentAdmissionsTab';
import StudentAttendanceTab from '@/features/students/components/details/StudentAttendanceTab';
import StudentFeesTab from '@/features/students/components/details/StudentFeesTab';
import StudentFullEditDialog from '@/features/students/components/details/StudentFullEditDialog';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-details-tabpanel-${index}`}
      aria-labelledby={`student-details-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const studentId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const [currentTab, setCurrentTab] = React.useState(0);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    dob: '',
    gender: 'Male',
    department: 'General',
    status: 'active',
    phone: '',
    alternate_phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    previous_school_name: '',
    previous_school_details: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    target_academic_year_id: '',
    target_grade_id: '',
    target_section_id: '',
    transfer_reason: '',
  });

  // Query comprehensive details
  const {
    data: studentData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: studentKeys.details(studentId),
    queryFn: () => adminStudentApi.getStudentComprehensiveDetails(studentId),
    enabled: Boolean(studentId),
  });

  // Queries for Academic Transfer options
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years-for-edit'],
    queryFn: adminGradeApi.listAcademicYears,
    enabled: isEditOpen,
  });

  const { data: rawGradesList } = useQuery({
    queryKey: gradeKeys.list({ academic_year_id: editFormData.target_academic_year_id, status: 'active', size: 100 }),
    queryFn: () => adminGradeApi.listGrades({ academic_year_id: editFormData.target_academic_year_id, status: 'active', size: 100 }),
    enabled: Boolean(editFormData.target_academic_year_id),
  });
  const gradesList: any[] = Array.isArray(rawGradesList)
    ? rawGradesList
    : ((rawGradesList as any)?.items || []);

  const { data: rawSectionsList } = useQuery({
    queryKey: ['sections-for-edit', editFormData.target_grade_id],
    queryFn: () => adminGradeApi.getGradeSections(editFormData.target_grade_id),
    enabled: Boolean(editFormData.target_grade_id),
  });
  const sectionsList: any[] = Array.isArray(rawSectionsList)
    ? rawSectionsList
    : ((rawSectionsList as any)?.items || []);

  const p = (studentData as any)?.personal_details || (studentData as any)?.personal_info;
  const a = (studentData as any)?.academic_details || (studentData as any)?.academic_info;
  const adm = (studentData as any)?.admission_details || (studentData as any)?.admission_info;
  const att = studentData?.attendance_summary;
  const fee = (studentData as any)?.fees || (studentData as any)?.fee_summary;

  const handleOpenEdit = () => {
    if (!studentData) return;
    setEditFormData({
      first_name: p?.first_name || '',
      middle_name: p?.middle_name || '',
      last_name: p?.last_name || '',
      dob: p?.dob || '',
      gender: p?.gender || 'Male',
      department: p?.department || 'General',
      status: p?.status || 'active',
      phone: p?.phone || '',
      alternate_phone: p?.alternate_phone || '',
      address: p?.address || '',
      city: p?.city || '',
      state: p?.state || '',
      country: p?.country || '',
      postal_code: p?.postal_code || '',
      previous_school_name: adm?.previous_school_name || '',
      previous_school_details: adm?.previous_school_details || '',
      guardian_name: p?.guardian_name || '',
      guardian_phone: p?.guardian_phone || '',
      guardian_email: p?.guardian_email || '',
      target_academic_year_id: '',
      target_grade_id: '',
      target_section_id: '',
      transfer_reason: '',
    });
    setIsEditOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: (payload: StudentUpdatePayload) => adminStudentApi.updateStudent(studentId, payload),
    onSuccess: () => {
      showSnackbar('Student profile updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: studentKeys.details(studentId) });
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      setIsEditOpen(false);
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to update student profile'), 'error');
    },
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: StudentUpdatePayload = {
      first_name: editFormData.first_name,
      middle_name: editFormData.middle_name || undefined,
      last_name: editFormData.last_name,
      dob: editFormData.dob,
      gender: editFormData.gender,
      department: editFormData.department,
      status: editFormData.status,
      phone: editFormData.phone || undefined,
      alternate_phone: editFormData.alternate_phone || undefined,
      address: editFormData.address || undefined,
      city: editFormData.city || undefined,
      state: editFormData.state || undefined,
      country: editFormData.country || undefined,
      postal_code: editFormData.postal_code || undefined,
      previous_school_name: editFormData.previous_school_name || undefined,
      previous_school_details: editFormData.previous_school_details || undefined,
      guardian_name: editFormData.guardian_name || undefined,
      guardian_phone: editFormData.guardian_phone || undefined,
      guardian_email: editFormData.guardian_email || undefined,
      target_academic_year_id: editFormData.target_academic_year_id || undefined,
      target_grade_id: editFormData.target_grade_id || undefined,
      target_section_id: editFormData.target_section_id || undefined,
      transfer_reason: editFormData.transfer_reason || undefined,
    };
    updateMutation.mutate(payload);
  };

  return (
    <RequireRole roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
          {/* Top Navigation & Back Action */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/students')}
              sx={{ textTransform: 'none' }}
            >
              Back to Students
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<EditIcon />}
                onClick={handleOpenEdit}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Edit Student Profile
              </Button>
            </Box>
          </Box>

          {/* Loading and Error States */}
          {isLoading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12 }}>
              <CircularProgress size={48} />
              <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
                Loading comprehensive student profile...
              </Typography>
            </Box>
          )}

          {isError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => refetch()}>
                  Retry
                </Button>
              }
              sx={{ my: 4 }}
            >
              {(error as any)?.response?.data?.detail || 'Failed to load student details.'}
            </Alert>
          )}

          {studentData && p && (
            <>
              {/* Profile Overview Card */}
              <StudentHeaderCard
                studentData={studentData}
                onOpenEdit={handleOpenEdit}
              />

              {/* Navigation Tabs */}
              <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                  <Tabs
                    value={currentTab}
                    onChange={(_, val) => setCurrentTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Student details tabs"
                  >
                    <Tab icon={<PersonIcon />} iconPosition="start" label="Overview & Personal" />
                    <Tab icon={<SchoolIcon />} iconPosition="start" label="Academics & Schedule" />
                    <Tab icon={<FamilyRestroomIcon />} iconPosition="start" label={`Parents (${studentData.parents?.length || 0})`} />
                    <Tab icon={<AssignmentIcon />} iconPosition="start" label="Admissions" />
                    <Tab icon={<EventAvailableIcon />} iconPosition="start" label="Attendance & Leaves" />
                    <Tab icon={<PaymentsIcon />} iconPosition="start" label="Fees & Ledger" />
                  </Tabs>
                </Box>

                <Box sx={{ p: { xs: 2, md: 3 } }}>
                  <TabPanel value={currentTab} index={0}>
                    <StudentOverviewTab personalInfo={p} />
                  </TabPanel>

                  <TabPanel value={currentTab} index={1}>
                    <StudentAcademicsTab
                      academicInfo={a}
                      timetable={studentData.timetable || []}
                      currentGrade={studentData.academic_details?.current_grade}
                      currentSection={studentData.academic_details?.current_section}
                    />
                  </TabPanel>

                  <TabPanel value={currentTab} index={2}>
                    <StudentParentsTab parents={studentData.parents || []} />
                  </TabPanel>

                  <TabPanel value={currentTab} index={3}>
                    <StudentAdmissionsTab admissionInfo={adm} personalInfo={p} />
                  </TabPanel>

                  <TabPanel value={currentTab} index={4}>
                    <StudentAttendanceTab
                      attendanceInfo={att}
                      leaveApplications={studentData.leave_applications || []}
                    />
                  </TabPanel>

                  <TabPanel value={currentTab} index={5}>
                    <StudentFeesTab feeInfo={fee} />
                  </TabPanel>
                </Box>
              </Paper>

              {/* Comprehensive Edit Dialog */}
              <StudentFullEditDialog
                open={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                studentName={`${p.first_name} ${p.last_name}`}
                studentCode={studentData.student_code}
                editFormData={editFormData}
                setEditFormData={setEditFormData}
                onSubmit={handleSaveEdit}
                isSubmitting={updateMutation.isPending}
                academicYears={academicYears}
                gradesList={gradesList}
                sectionsList={sectionsList}
              />
            </>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
