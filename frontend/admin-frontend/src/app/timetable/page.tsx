'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DoneIcon from '@mui/icons-material/Done';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import PageHeader from '@/components/ui/PageHeader';
import { ROLES } from '@/lib/constants';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { adminTeacherApi, teacherKeys } from '@/features/teachers/api';
import { teacherSubjectApi, teacherSubjectKeys } from '@/features/teachers/subjectApi';
import { timetableApi, timetableKeys } from '@/features/timetables/api';
import {
  Shift,
  Period,
  TimetableSlot,
  ClashValidationResult,
  SaveDraftPayload,
} from '@/features/timetables/types';

import {
  TimetableFilterBar,
  TimetableActionBar,
  TimetableDateCheckBar,
  TimetableMatrixGrid,
  ShiftsListPanel,
  PeriodsListPanel,
  CellEditorDialog,
  CreateShiftDialog,
  AddPeriodDialog,
  AssignGradesToShiftDialog,
} from '@/features/timetables/components';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
];

export default function AdminTimetablePage() {
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = React.useState<number>(0);

  // Class Timetable state
  const [selectedAcademicYearId, setSelectedAcademicYearId] = React.useState<string>('');
  const [selectedGradeId, setSelectedGradeId] = React.useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');

  // Editable grid state: map key `${day}_${periodId}` -> TimetableSlot
  const [gridEntries, setGridEntries] = React.useState<Record<string, TimetableSlot>>({});
  const [clashResult, setClashResult] = React.useState<ClashValidationResult | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Cell Editor Dialog state
  const [cellDialogOpen, setCellDialogOpen] = React.useState(false);
  const [editingSlot, setEditingSlot] = React.useState<{
    day: number;
    period: Period;
    subjectId: string;
    teacherId: string;
    roomNumber: string;
  } | null>(null);

  // Shift & Period Config state
  const [selectedShiftId, setSelectedShiftId] = React.useState<string>('');
  const [selectedShiftToAssign, setSelectedShiftToAssign] = React.useState<string>('');
  const [createShiftOpen, setCreateShiftOpen] = React.useState(false);
  const [newShift, setNewShift] = React.useState({
    name: '',
    start_time: '07:00',
    end_time: '12:00',
    working_days: 'Monday,Tuesday,Wednesday,Thursday,Friday',
    assigned_grade_ids: [] as string[],
  });
  const [addPeriodOpen, setAddPeriodOpen] = React.useState(false);
  const [newPeriod, setNewPeriod] = React.useState({
    number: 1,
    name: '',
    start_time: '07:00',
    end_time: '07:45',
    is_break: false,
  });

  // Assign Grades to Shift Dialog State
  const [assignGradesOpen, setAssignGradesOpen] = React.useState(false);
  const [shiftToAssignGrades, setShiftToAssignGrades] = React.useState<Shift | null>(null);
  const [selectedGradeIdsForShift, setSelectedGradeIdsForShift] = React.useState<string[]>([]);

  // Preview Date for Holiday & Calendar checks
  const [previewDate, setPreviewDate] = React.useState<string>('');

  // Queries
  const { data: academicYears } = useQuery({
    queryKey: gradeKeys.academicYears,
    queryFn: adminGradeApi.listAcademicYears,
  });

  const { data: gradesData, refetch: refetchGrades } = useQuery({
    queryKey: gradeKeys.list({ academic_year_id: selectedAcademicYearId }),
    queryFn: () => adminGradeApi.listGrades({ academic_year_id: selectedAcademicYearId }),
    enabled: !!selectedAcademicYearId,
  });

  const { data: gradeDetail, refetch: refetchGradeDetail } = useQuery({
    queryKey: gradeKeys.detail(selectedGradeId),
    queryFn: () => adminGradeApi.getGrade(selectedGradeId),
    enabled: !!selectedGradeId,
  });

  const { data: teachersData } = useQuery({
    queryKey: teacherKeys.list({ limit: 100 }),
    queryFn: () => adminTeacherApi.listTeachers({ limit: 100 }),
  });

  const { data: subjectsData } = useQuery({
    queryKey: teacherSubjectKeys.subjects(),
    queryFn: teacherSubjectApi.listSubjects,
  });

  const { data: shiftsList = [], refetch: refetchShifts } = useQuery({
    queryKey: timetableKeys.shifts,
    queryFn: timetableApi.listShifts,
  });

  // Fetch timetable for selected section
  const {
    data: timetableData,
    isLoading: loadingTimetable,
    refetch: refetchTimetable,
  } = useQuery({
    queryKey: ['timetable', 'class', selectedSectionId, selectedAcademicYearId, previewDate || undefined],
    queryFn: () => timetableApi.getClassTimetable(selectedSectionId, selectedAcademicYearId, previewDate || undefined),
    enabled: !!selectedSectionId,
  });

  // Auto-select defaults
  React.useEffect(() => {
    if (academicYears && academicYears.length > 0 && !selectedAcademicYearId) {
      const current = academicYears.find((ay) => ay.is_current) || academicYears[0];
      setSelectedAcademicYearId(current.id);
    }
  }, [academicYears, selectedAcademicYearId]);

  React.useEffect(() => {
    if (gradesData?.items && gradesData.items.length > 0 && !selectedGradeId) {
      setSelectedGradeId(gradesData.items[0].id);
    }
  }, [gradesData, selectedGradeId]);

  React.useEffect(() => {
    if (gradeDetail?.sections && gradeDetail.sections.length > 0) {
      setSelectedSectionId(gradeDetail.sections[0].id);
    } else {
      setSelectedSectionId('');
    }
  }, [gradeDetail]);

  React.useEffect(() => {
    if (shiftsList.length > 0 && !selectedShiftId) {
      setSelectedShiftId(shiftsList[0].id);
    }
    if (shiftsList.length > 0 && !selectedShiftToAssign) {
      setSelectedShiftToAssign(shiftsList[0].id);
    }
  }, [shiftsList, selectedShiftId, selectedShiftToAssign]);

  // Synchronize remote timetable entries into local editable grid
  React.useEffect(() => {
    if (timetableData) {
      const map: Record<string, TimetableSlot> = {};
      for (const e of timetableData.entries) {
        map[`${e.day_of_week}_${e.period_id}`] = e;
      }
      setGridEntries(map);
    } else {
      setGridEntries({});
    }
    setClashResult(null);
    setSaveSuccessMsg(null);
  }, [timetableData]);

  // Selected Grade's Shift and Periods
  const currentGrade = gradesData?.items?.find((g) => g.id === selectedGradeId);
  const activeShift = shiftsList.find(
    (s) => s.id === (timetableData?.shift_id || currentGrade?.shift_id)
  );
  const activePeriods = activeShift?.periods
    ? [...activeShift.periods].sort((a, b) => a.number - b.number)
    : [];

  // Parse working days
  const activeWorkingDays = React.useMemo(() => {
    if (timetableData?.working_days && timetableData.working_days.length > 0) {
      return DAYS_OF_WEEK.filter((d) => timetableData.working_days.includes(d.label));
    }
    if (activeShift?.working_days) {
      const days = activeShift.working_days.split(',').map((d) => d.trim());
      return DAYS_OF_WEEK.filter((d) => days.includes(d.label));
    }
    return DAYS_OF_WEEK.slice(0, 5); // default Mon-Fri
  }, [timetableData, activeShift]);

  // Handlers for slot editing
  const handleOpenCellEditor = (day: number, period: Period) => {
    if (period.is_break) return;
    const existing = gridEntries[`${day}_${period.id}`];
    setEditingSlot({
      day,
      period,
      subjectId: existing?.subject_id || '',
      teacherId: existing?.teacher_id || '',
      roomNumber: existing?.room_number || '',
    });
    setCellDialogOpen(true);
  };

  const handleSaveCell = (slotState: {
    day: number;
    period: Period;
    subjectId: string;
    teacherId: string;
    roomNumber: string;
  }) => {
    const key = `${slotState.day}_${slotState.period.id}`;
    if (!slotState.subjectId) {
      setGridEntries((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      const sub = subjectsData?.find((s) => s.id === slotState.subjectId);
      const matchedTeacher = (teachersData?.items as any[])
        ?.map((u) => u.teacher)
        ?.find((t) => t?.id === slotState.teacherId);
      const updatedSlot: TimetableSlot = {
        day_of_week: slotState.day,
        period_id: slotState.period.id,
        period_number: slotState.period.number,
        period_name: slotState.period.name,
        start_time: slotState.period.start_time,
        end_time: slotState.period.end_time,
        is_break: false,
        subject_id: slotState.subjectId,
        subject_name: sub?.name,
        subject_code: sub?.code,
        teacher_id: slotState.teacherId || undefined,
        teacher_name: matchedTeacher ? `${matchedTeacher.first_name} ${matchedTeacher.last_name}` : undefined,
        room_number: slotState.roomNumber || undefined,
      };
      setGridEntries((prev) => ({ ...prev, [key]: updatedSlot }));
    }
    setCellDialogOpen(false);
    setClashResult(null);
  };

  const handleClearCell = () => {
    if (!editingSlot) return;
    const key = `${editingSlot.day}_${editingSlot.period.id}`;
    setGridEntries((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setCellDialogOpen(false);
    setClashResult(null);
  };

  const buildPayload = (): SaveDraftPayload => {
    const entries = Object.values(gridEntries).map((e) => ({
      day_of_week: e.day_of_week,
      period_id: e.period_id,
      subject_id: e.subject_id,
      teacher_id: e.teacher_id,
      room_number: e.room_number,
    }));
    return {
      academic_year_id: selectedAcademicYearId,
      grade_id: selectedGradeId,
      section_id: selectedSectionId,
      entries,
    };
  };

  // Mutations
  const validateMutation = useMutation({
    mutationFn: (payload: SaveDraftPayload) => timetableApi.validateClashes(payload),
    onSuccess: (res) => {
      setClashResult(res);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.detail || 'Failed to validate clashes');
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: (payload: SaveDraftPayload) => timetableApi.saveDraft(payload),
    onSuccess: () => {
      setSaveSuccessMsg('Timetable draft saved successfully!');
      setActionError(null);
      refetchTimetable();
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.detail || 'Failed to save timetable draft');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => timetableApi.publish(id),
    onSuccess: () => {
      setSaveSuccessMsg('Timetable published officially! Students and teachers can now see the updated schedule.');
      setActionError(null);
      refetchTimetable();
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.detail || 'Failed to publish timetable');
    },
  });

  // Shift & Period Mutations
  const createShiftMutation = useMutation({
    mutationFn: (data: typeof newShift) => timetableApi.createShift(data),
    onSuccess: (created) => {
      refetchShifts();
      setSelectedShiftId(created.id);
      setCreateShiftOpen(false);
      setNewShift({
        name: '',
        start_time: '07:00',
        end_time: '12:00',
        working_days: 'Monday,Tuesday,Wednesday,Thursday,Friday',
        assigned_grade_ids: [],
      });
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.detail || 'Failed to create shift');
    },
  });

  const assignShiftMutation = useMutation({
    mutationFn: ({ gradeId, shiftId }: { gradeId: string; shiftId: string | null }) =>
      timetableApi.assignShiftToGrade(gradeId, shiftId),
    onSuccess: () => {
      setSaveSuccessMsg('Grade shift assignment updated successfully!');
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      refetchGrades();
      refetchGradeDetail();
      refetchShifts();
      refetchTimetable();
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.detail || 'Failed to update grade shift');
    },
  });

  const assignGradesToShiftMutation = useMutation({
    mutationFn: ({ shiftId, gradeIds }: { shiftId: string; gradeIds: string[] }) =>
      timetableApi.assignGradesToShift(shiftId, gradeIds),
    onSuccess: () => {
      setSaveSuccessMsg('Grades assigned to shift successfully!');
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
      refetchShifts();
      setAssignGradesOpen(false);
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.detail || 'Failed to assign grades to shift');
    },
  });

  const addPeriodMutation = useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: string; data: typeof newPeriod }) =>
      timetableApi.addPeriod(shiftId, data),
    onSuccess: () => {
      refetchShifts();
      setAddPeriodOpen(false);
      setNewPeriod((prev) => ({
        number: prev.number + 1,
        name: '',
        start_time: prev.end_time,
        end_time: '',
        is_break: false,
      }));
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.detail || 'Failed to add period');
    },
  });

  const selectedShiftDetails = shiftsList.find((s) => s.id === selectedShiftId);

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
          <PageHeader
            title="Timetable Management"
            subtitle="Configure school shifts, period timings, and construct conflict-free class schedules."
          />

          {/* Navigation Tabs */}
          <Paper sx={{ mb: 3, borderRadius: 2 }}>
            <Tabs
              value={currentTab}
              onChange={(_, val) => setCurrentTab(val)}
              indicatorColor="primary"
              textColor="primary"
              sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Class Timetables" sx={{ fontWeight: 600 }} />
              <Tab label="Shifts & Period Timings" sx={{ fontWeight: 600 }} />
            </Tabs>
          </Paper>

          {/* TAB 0: Class Timetables */}
          {currentTab === 0 && (
            <Box>
              <TimetableFilterBar
                academicYears={academicYears}
                selectedAcademicYearId={selectedAcademicYearId}
                onAcademicYearChange={setSelectedAcademicYearId}
                grades={gradesData?.items}
                selectedGradeId={selectedGradeId}
                onGradeChange={setSelectedGradeId}
                sections={gradeDetail?.sections}
                selectedSectionId={selectedSectionId}
                onSectionChange={setSelectedSectionId}
                shiftsList={shiftsList}
                currentGradeShiftId={currentGrade?.shift_id}
                onAssignShift={(shiftId) => {
                  if (selectedGradeId) {
                    assignShiftMutation.mutate({ gradeId: selectedGradeId, shiftId });
                  }
                }}
                isAssigningShift={assignShiftMutation.isPending}
              />

              <TimetableActionBar
                timetableData={timetableData}
                activeShift={activeShift}
                hasPeriods={activePeriods.length > 0}
                onRefresh={() => refetchTimetable()}
                onValidate={() => validateMutation.mutate(buildPayload())}
                isValidating={validateMutation.isPending}
                onSaveDraft={() => saveDraftMutation.mutate(buildPayload())}
                isSaving={saveDraftMutation.isPending}
                onPublish={() => timetableData && publishMutation.mutate(timetableData.id)}
                isPublishing={publishMutation.isPending}
                clashResult={clashResult}
              />

              {/* Status Notifications */}
              {actionError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                  {actionError}
                </Alert>
              )}

              {saveSuccessMsg && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveSuccessMsg(null)}>
                  {saveSuccessMsg}
                </Alert>
              )}

              {clashResult && (
                <Alert
                  severity={clashResult.has_clashes ? 'warning' : 'success'}
                  icon={clashResult.has_clashes ? <WarningAmberIcon /> : <DoneIcon />}
                  sx={{ mb: 2 }}
                >
                  {clashResult.has_clashes ? (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Clashes Detected ({clashResult.clashes.length}):
                      </Typography>
                      <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                        {clashResult.clashes.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </Box>
                  ) : (
                    'All scheduled periods are conflict-free! No teacher double-bookings detected.'
                  )}
                </Alert>
              )}

              {/* Calendar Date Status Check */}
              {selectedSectionId && (
                <TimetableDateCheckBar
                  previewDate={previewDate}
                  onPreviewDateChange={setPreviewDate}
                  timetableData={timetableData}
                />
              )}

              {/* Matrix Grid / Loading */}
              {loadingTimetable ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TimetableMatrixGrid
                  activeShift={activeShift}
                  activePeriods={activePeriods}
                  activeWorkingDays={activeWorkingDays}
                  gridEntries={gridEntries}
                  shiftsList={shiftsList}
                  currentGradeName={currentGrade?.name}
                  selectedShiftToAssign={selectedShiftToAssign}
                  onSelectShiftToAssign={setSelectedShiftToAssign}
                  onAssignShift={(shiftId) => {
                    if (selectedGradeId) {
                      assignShiftMutation.mutate({ gradeId: selectedGradeId, shiftId });
                    }
                  }}
                  isAssigningShift={assignShiftMutation.isPending}
                  onSwitchToShiftsTab={(shiftId) => {
                    if (shiftId) setSelectedShiftId(shiftId);
                    setCurrentTab(1);
                  }}
                  onOpenCellEditor={handleOpenCellEditor}
                />
              )}
            </Box>
          )}

          {/* TAB 1: Shifts & Period Timings */}
          {currentTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <ShiftsListPanel
                  shiftsList={shiftsList}
                  selectedShiftId={selectedShiftId}
                  onSelectShift={setSelectedShiftId}
                  onOpenCreateShift={() => setCreateShiftOpen(true)}
                />
              </Grid>

              <Grid item xs={12} md={8}>
                <PeriodsListPanel
                  selectedShiftDetails={selectedShiftDetails}
                  onOpenAssignGrades={() => {
                    const target = shiftsList.find((s) => s.id === selectedShiftId);
                    if (target) {
                      setShiftToAssignGrades(target);
                      setSelectedGradeIdsForShift(target.assigned_grade_ids || []);
                      setAssignGradesOpen(true);
                    }
                  }}
                  onOpenAddPeriod={() => setAddPeriodOpen(true)}
                />
              </Grid>
            </Grid>
          )}

          {/* Dialog: Assign / Edit Slot */}
          <CellEditorDialog
            open={cellDialogOpen}
            onClose={() => setCellDialogOpen(false)}
            editingSlot={editingSlot}
            dayLabel={DAYS_OF_WEEK.find((d) => d.id === editingSlot?.day)?.label}
            subjects={subjectsData}
            teachersData={teachersData}
            onSave={handleSaveCell}
            onClear={handleClearCell}
          />

          {/* Dialog: Create Shift */}
          <CreateShiftDialog
            open={createShiftOpen}
            onClose={() => setCreateShiftOpen(false)}
            form={newShift}
            onChangeForm={setNewShift}
            grades={gradesData?.items || []}
            onSubmit={() => createShiftMutation.mutate(newShift)}
            isSubmitting={createShiftMutation.isPending}
          />

          {/* Dialog: Add Period */}
          <AddPeriodDialog
            open={addPeriodOpen}
            onClose={() => setAddPeriodOpen(false)}
            form={newPeriod}
            onChangeForm={setNewPeriod}
            onSubmit={() =>
              addPeriodMutation.mutate({
                shiftId: selectedShiftId,
                data: newPeriod,
              })
            }
            isSubmitting={addPeriodMutation.isPending}
          />

          {/* Dialog: Assign Grades to Shift */}
          <AssignGradesToShiftDialog
            open={assignGradesOpen}
            onClose={() => setAssignGradesOpen(false)}
            shift={shiftToAssignGrades}
            selectedGradeIds={selectedGradeIdsForShift}
            onChangeSelectedGrades={setSelectedGradeIdsForShift}
            grades={gradesData?.items || []}
            onSubmit={() => {
              if (shiftToAssignGrades) {
                assignGradesToShiftMutation.mutate({
                  shiftId: shiftToAssignGrades.id,
                  gradeIds: selectedGradeIdsForShift,
                });
              }
            }}
            isSubmitting={assignGradesToShiftMutation.isPending}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}
