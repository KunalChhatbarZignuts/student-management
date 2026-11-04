'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DoneIcon from '@mui/icons-material/Done';
import RefreshIcon from '@mui/icons-material/Refresh';
import LinkIcon from '@mui/icons-material/Link';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import TodayIcon from '@mui/icons-material/Today';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import AppTimePicker from '@/components/ui/AppTimePicker';
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

  const { data: shiftsList, refetch: refetchShifts } = useQuery({
    queryKey: timetableKeys.shifts,
    queryFn: timetableApi.listShifts,
  });

  const [previewDate, setPreviewDate] = React.useState<string>('');

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
    if (shiftsList && shiftsList.length > 0 && !selectedShiftId) {
      setSelectedShiftId(shiftsList[0].id);
    }
    if (shiftsList && shiftsList.length > 0 && !selectedShiftToAssign) {
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
  const activeShift = shiftsList?.find(
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

  const handleSaveCell = () => {
    if (!editingSlot) return;
    const key = `${editingSlot.day}_${editingSlot.period.id}`;
    if (!editingSlot.subjectId) {
      // Clear cell
      setGridEntries((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      const sub = subjectsData?.find((s) => s.id === editingSlot.subjectId);
      const matchedTeacher = (teachersData?.items as any[])
        ?.map((u) => u.teacher)
        ?.find((t) => t?.id === editingSlot.teacherId);
      const updatedSlot: TimetableSlot = {
        day_of_week: editingSlot.day,
        period_id: editingSlot.period.id,
        period_number: editingSlot.period.number,
        period_name: editingSlot.period.name,
        start_time: editingSlot.period.start_time,
        end_time: editingSlot.period.end_time,
        is_break: false,
        subject_id: editingSlot.subjectId,
        subject_name: sub?.name,
        subject_code: sub?.code,
        teacher_id: editingSlot.teacherId || undefined,
        teacher_name: matchedTeacher ? `${matchedTeacher.first_name} ${matchedTeacher.last_name}` : undefined,
        room_number: editingSlot.roomNumber || undefined,
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

  const selectedShiftDetails = shiftsList?.find((s) => s.id === selectedShiftId);

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Timetable Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Configure school shifts, period timings, and construct conflict-free class schedules.
            </Typography>
          </Box>

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
              {/* Filter Controls */}
              <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="ay-label">Academic Year</InputLabel>
                      <Select
                        labelId="ay-label"
                        value={selectedAcademicYearId}
                        label="Academic Year"
                        onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                      >
                        {academicYears?.map((ay) => (
                          <MenuItem key={ay.id} value={ay.id}>
                            {ay.name} {ay.is_current ? '(Current)' : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="grade-label">Grade</InputLabel>
                      <Select
                        labelId="grade-label"
                        value={selectedGradeId}
                        label="Grade"
                        onChange={(e) => setSelectedGradeId(e.target.value)}
                      >
                        {gradesData?.items?.map((g) => (
                          <MenuItem key={g.id} value={g.id}>
                            {g.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="sec-label">Section</InputLabel>
                      <Select
                        labelId="sec-label"
                        value={selectedSectionId}
                        label="Section"
                        onChange={(e) => setSelectedSectionId(e.target.value)}
                      >
                        {gradeDetail?.sections?.map((sec) => (
                          <MenuItem key={sec.id} value={sec.id}>
                            {sec.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="shift-assign-label">Assigned Shift</InputLabel>
                      <Select
                        labelId="shift-assign-label"
                        value={currentGrade?.shift_id || ''}
                        label="Assigned Shift"
                        disabled={assignShiftMutation.isPending || !selectedGradeId}
                        onChange={(e) => {
                          const shiftId = e.target.value || null;
                          if (selectedGradeId) {
                            assignShiftMutation.mutate({ gradeId: selectedGradeId, shiftId });
                          }
                        }}
                      >
                        <MenuItem value="">
                          <em>None (Unassigned)</em>
                        </MenuItem>
                        {shiftsList?.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name} ({s.start_time} - {s.end_time})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>

              {/* Status & Shift Information Banner */}
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 2,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                  <Chip
                    label={
                      timetableData?.status === 'published'
                        ? `Published (v${timetableData.version})`
                        : timetableData?.status === 'draft'
                        ? `Draft (v${timetableData.version})`
                        : 'No Timetable Created'
                    }
                    color={
                      timetableData?.status === 'published'
                        ? 'success'
                        : timetableData?.status === 'draft'
                        ? 'warning'
                        : 'default'
                    }
                    sx={{ fontWeight: 600 }}
                  />
                  {activeShift ? (
                    <Chip
                      icon={<AccessTimeIcon />}
                      label={`Shift: ${activeShift.name} (${activeShift.start_time} - ${activeShift.end_time})`}
                      variant="outlined"
                      color="primary"
                    />
                  ) : (
                    <Chip
                      icon={<WarningAmberIcon />}
                      label="No Shift Assigned to Grade"
                      variant="outlined"
                      color="warning"
                    />
                  )}
                  <Button
                    variant="text"
                    startIcon={<RefreshIcon />}
                    onClick={() => refetchTimetable()}
                    size="small"
                  >
                    Refresh
                  </Button>
                </Stack>

                {/* Action Buttons */}
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<CheckCircleOutlineIcon />}
                    onClick={() => validateMutation.mutate(buildPayload())}
                    disabled={validateMutation.isPending || activePeriods.length === 0}
                  >
                    {validateMutation.isPending ? 'Validating...' : 'Validate Clashes'}
                  </Button>

                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={() => saveDraftMutation.mutate(buildPayload())}
                    disabled={saveDraftMutation.isPending || activePeriods.length === 0}
                  >
                    {saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}
                  </Button>

                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PublishIcon />}
                    onClick={() => timetableData && publishMutation.mutate(timetableData.id)}
                    disabled={
                      publishMutation.isPending ||
                      !timetableData?.id ||
                      clashResult?.has_clashes === true
                    }
                  >
                    {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                  </Button>
                </Stack>
              </Box>

              {/* Alerts */}
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

              {/* Calendar Date Status Check Bar */}
              {selectedSectionId && (
                <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, bgcolor: 'action.hover' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TodayIcon color="action" fontSize="small" />
                    <Typography variant="body2" fontWeight={600}>Calendar Date Check:</Typography>
                    <TextField
                      type="date"
                      size="small"
                      value={previewDate}
                      onChange={(e) => setPreviewDate(e.target.value)}
                      sx={{ width: 170 }}
                    />
                    {previewDate && (
                      <Button size="small" variant="text" onClick={() => setPreviewDate('')}>
                        Clear
                      </Button>
                    )}
                  </Box>

                  {timetableData?.date_status && previewDate && (
                    <Chip
                      label={
                        timetableData.date_status.is_working_day
                          ? (timetableData.date_status.day_type === 'special_working_day'
                              ? 'Compensatory Special Working Day'
                              : 'Regular School Day')
                          : (timetableData.date_status.day_type === 'weekly_off'
                              ? 'Weekly Off (Sunday)'
                              : `Holiday: ${timetableData.date_status.holiday_name || 'School Holiday'}`)
                      }
                      color={
                        timetableData.date_status.is_working_day
                          ? (timetableData.date_status.day_type === 'special_working_day' ? 'success' : 'primary')
                          : 'warning'
                      }
                      icon={timetableData.date_status.is_working_day ? <CheckCircleOutlineIcon /> : <EventBusyIcon />}
                      sx={{ fontWeight: 600 }}
                      size="small"
                    />
                  )}
                </Paper>
              )}

              {previewDate && timetableData?.is_holiday && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>Notice:</strong> The selected date ({previewDate}) is marked as a {timetableData.date_status?.day_type === 'weekly_off' ? 'Weekly Off (Sunday)' : 'School Holiday'} ({timetableData.date_status?.holiday_name || 'Holiday'}). Regular classes are automatically suspended on this date.
                </Alert>
              )}

              {/* Grid Loading or Empty State */}
              {loadingTimetable ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : !activeShift ? (
                <Paper
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: 'warning.main',
                    bgcolor: 'warning.50',
                  }}
                >
                  <WarningAmberIcon sx={{ fontSize: 44, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    No Shift Assigned to {currentGrade?.name || 'this Grade'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 540, mx: 'auto' }}>
                    Timetables are shift-based. To view the period grid and configure class schedules, assign an existing shift to this grade.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 260 }}>
                      <InputLabel id="quick-assign-shift-label">Select Shift</InputLabel>
                      <Select
                        labelId="quick-assign-shift-label"
                        value={selectedShiftToAssign || shiftsList?.[0]?.id || ''}
                        label="Select Shift"
                        id="quick-assign-select"
                        onChange={(e) => setSelectedShiftToAssign(e.target.value)}
                      >
                        {shiftsList?.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name} ({s.start_time} - {s.end_time})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="contained"
                      onClick={() => {
                        const targetShiftId = selectedShiftToAssign || shiftsList?.[0]?.id;
                        if (selectedGradeId && targetShiftId) {
                          assignShiftMutation.mutate({ gradeId: selectedGradeId, shiftId: targetShiftId });
                        } else {
                          setCurrentTab(1);
                        }
                      }}
                      disabled={assignShiftMutation.isPending || !shiftsList?.length}
                    >
                      {assignShiftMutation.isPending ? 'Assigning...' : 'Assign Shift & Load Grid'}
                    </Button>
                    <Button variant="outlined" onClick={() => setCurrentTab(1)}>
                      Configure New Shift
                    </Button>
                  </Stack>
                </Paper>
              ) : activePeriods.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Periods Configured for Shift &quot;{activeShift.name}&quot;
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Please switch to the &quot;Shifts &amp; Period Timings&quot; tab to set up reusable periods
                    for this shift.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setSelectedShiftId(activeShift.id);
                      setCurrentTab(1);
                    }}
                  >
                    Configure Periods for {activeShift.name}
                  </Button>
                </Paper>
              ) : (
                /* Matrix Timetable Grid */
                <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: 140 }}>Period / Time</TableCell>
                        {activeWorkingDays.map((day) => (
                          <TableCell key={day.id} align="center" sx={{ fontWeight: 700 }}>
                            {day.label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activePeriods.map((period) => (
                        <TableRow
                          key={period.id}
                          sx={{
                            bgcolor: period.is_break ? 'action.hover' : 'inherit',
                            '&:hover': { bgcolor: period.is_break ? 'action.hover' : 'grey.50' },
                          }}
                        >
                          {/* Period Header Column */}
                          <TableCell sx={{ verticalAlign: 'middle', borderRight: 1, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {period.name || `Period ${period.number}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {period.start_time} - {period.end_time}
                            </Typography>
                            {period.is_break && (
                              <Box sx={{ mt: 0.5 }}>
                                <Chip label="Break" size="small" color="default" />
                              </Box>
                            )}
                          </TableCell>

                          {/* Day Columns */}
                          {activeWorkingDays.map((day) => {
                            const key = `${day.id}_${period.id}`;
                            const entry = gridEntries[key];

                            if (period.is_break) {
                              return (
                                <TableCell
                                  key={day.id}
                                  align="center"
                                  sx={{
                                    bgcolor: 'rgba(0, 0, 0, 0.03)',
                                    color: 'text.secondary',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  {period.name || 'Recess / Break'}
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell
                                key={day.id}
                                align="center"
                                sx={{
                                  p: 1,
                                  cursor: 'pointer',
                                  border: 1,
                                  borderColor: 'divider',
                                  transition: 'background 0.2s',
                                  '&:hover': { bgcolor: 'action.selected' },
                                }}
                                onClick={() => handleOpenCellEditor(day.id, period)}
                              >
                                {entry?.subject_name ? (
                                  <Box
                                    sx={{
                                      p: 1,
                                      borderRadius: 1.5,
                                      bgcolor: 'primary.50',
                                      border: 1,
                                      borderColor: 'primary.200',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Typography variant="body2" fontWeight={700} color="primary.main">
                                        {entry.subject_name}
                                      </Typography>
                                      {entry.subject_code && (
                                        <Chip label={entry.subject_code} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                                      )}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {entry.teacher_name || 'Teacher unassigned'}
                                    </Typography>
                                    {entry.room_number && (
                                      <Typography variant="caption" color="text.disabled" display="block">
                                        Room: {entry.room_number}
                                      </Typography>
                                    )}
                                  </Box>
                                ) : (
                                  <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    sx={{ color: 'text.secondary', textTransform: 'none' }}
                                  >
                                    Assign
                                  </Button>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* TAB 1: Shifts & Period Timings */}
          {currentTab === 1 && (
            <Grid container spacing={3}>
              {/* Shifts List */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={700}>
                      School Shifts
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateShiftOpen(true)}
                    >
                      New Shift
                    </Button>
                  </Box>

                  <Stack spacing={1.5}>
                    {shiftsList?.map((shift) => (
                      <Card
                        key={shift.id}
                        variant={selectedShiftId === shift.id ? 'elevation' : 'outlined'}
                        sx={{
                          cursor: 'pointer',
                          borderColor: selectedShiftId === shift.id ? 'primary.main' : 'divider',
                          borderWidth: selectedShiftId === shift.id ? 2 : 1,
                        }}
                        onClick={() => setSelectedShiftId(shift.id)}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {shift.name}
                            </Typography>
                            <Chip
                              label={shift.status}
                              size="small"
                              color={shift.status === 'active' ? 'success' : 'default'}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Timings: {shift.start_time} - {shift.end_time}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Working Days: {shift.working_days || 'Monday-Friday'}
                          </Typography>
                          <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ mt: 0.5, display: 'block' }}>
                            {shift.periods?.length || 0} periods configured
                          </Typography>

                          {shift.assigned_grade_names && shift.assigned_grade_names.length > 0 ? (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                Grades:
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {shift.assigned_grade_names.map((gname, idx) => (
                                  <Chip
                                    key={idx}
                                    label={gname}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                              No grades assigned yet
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Paper>
              </Grid>

              {/* Periods for Selected Shift */}
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Periods: {selectedShiftDetails?.name || 'Select a shift'}
                      </Typography>
                      {selectedShiftDetails && (
                        <Typography variant="body2" color="text.secondary">
                          Reusable period template for shift ({selectedShiftDetails.start_time} -{' '}
                          {selectedShiftDetails.end_time})
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<LinkIcon />}
                        disabled={!selectedShiftId}
                        onClick={() => {
                          const target = shiftsList?.find((s) => s.id === selectedShiftId);
                          if (target) {
                            setShiftToAssignGrades(target);
                            setSelectedGradeIdsForShift(target.assigned_grade_ids || []);
                            setAssignGradesOpen(true);
                          }
                        }}
                      >
                        Assign Grades
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon />}
                        disabled={!selectedShiftId}
                        onClick={() => setAddPeriodOpen(true)}
                      >
                        Add Period
                      </Button>
                    </Stack>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Period Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Start Time</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>End Time</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedShiftDetails?.periods && selectedShiftDetails.periods.length > 0 ? (
                          [...selectedShiftDetails.periods]
                            .sort((a, b) => a.number - b.number)
                            .map((p) => (
                              <TableRow key={p.id}>
                                <TableCell>{p.number}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{p.name || `Period ${p.number}`}</TableCell>
                                <TableCell>{p.start_time}</TableCell>
                                <TableCell>{p.end_time}</TableCell>
                                <TableCell>
                                  {p.is_break ? (
                                    <Chip label="Break / Recess" color="warning" size="small" />
                                  ) : (
                                    <Chip label="Teaching Period" color="primary" size="small" variant="outlined" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              No periods created yet for this shift. Click &quot;Add Period&quot; to configure timings.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Dialog: Assign / Edit Slot */}
          <Dialog open={cellDialogOpen} onClose={() => setCellDialogOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>
              {editingSlot ? `Assign ${editingSlot.period.name || `Period ${editingSlot.period.number}`}` : 'Slot Editor'}
            </DialogTitle>
            <DialogContent dividers>
              {editingSlot && (
                <Stack spacing={2.5} sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {DAYS_OF_WEEK.find((d) => d.id === editingSlot.day)?.label} ({editingSlot.period.start_time} -{' '}
                    {editingSlot.period.end_time})
                  </Typography>

                  <FormControl fullWidth size="small">
                    <InputLabel id="slot-sub-label">Subject</InputLabel>
                    <Select
                      labelId="slot-sub-label"
                      value={editingSlot.subjectId}
                      label="Subject"
                      onChange={(e) => setEditingSlot({ ...editingSlot, subjectId: e.target.value })}
                    >
                      <MenuItem value="">
                        <em>None (Clear Slot)</em>
                      </MenuItem>
                      {subjectsData?.map((sub) => (
                        <MenuItem key={sub.id} value={sub.id}>
                          {sub.name} ({sub.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel id="slot-teacher-label">Teacher</InputLabel>
                    <Select
                      labelId="slot-teacher-label"
                      value={editingSlot.teacherId}
                      label="Teacher"
                      onChange={(e) => setEditingSlot({ ...editingSlot, teacherId: e.target.value })}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {(teachersData?.items as any[])?.map((u: any) => {
                        const t = u.teacher;
                        if (!t) return null;
                        return (
                          <MenuItem key={t.id} value={t.id}>
                            {t.first_name} {t.last_name} ({t.employee_code || t.department || 'Staff'})
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Room Number"
                    size="small"
                    fullWidth
                    value={editingSlot.roomNumber}
                    onChange={(e) => setEditingSlot({ ...editingSlot, roomNumber: e.target.value })}
                    placeholder="e.g. Lab 2, Room 104"
                  />
                </Stack>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Button color="error" onClick={handleClearCell} startIcon={<DeleteOutlineIcon />}>
                Clear Slot
              </Button>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setCellDialogOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleSaveCell}>
                  Save Slot
                </Button>
              </Stack>
            </DialogActions>
          </Dialog>

          {/* Dialog: Create Shift */}
          <Dialog open={createShiftOpen} onClose={() => setCreateShiftOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Create New School Shift</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5} sx={{ mt: 1 }}>
                <TextField
                  label="Shift Name"
                  size="small"
                  fullWidth
                  required
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  placeholder="e.g. Morning Shift"
                />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <AppTimePicker
                      label="Shift Start Time"
                      required
                      value={newShift.start_time}
                      onChange={(val) => setNewShift({ ...newShift, start_time: val })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <AppTimePicker
                      label="Shift End Time"
                      required
                      value={newShift.end_time}
                      onChange={(val) => setNewShift({ ...newShift, end_time: val })}
                    />
                  </Grid>
                </Grid>
                <TextField
                  label="Working Days (comma separated)"
                  size="small"
                  fullWidth
                  value={newShift.working_days}
                  onChange={(e) => setNewShift({ ...newShift, working_days: e.target.value })}
                  placeholder="Monday,Tuesday,Wednesday,Thursday,Friday"
                />
                <FormControl fullWidth size="small">
                  <InputLabel id="create-shift-grades-label">Assign to Grades (Optional)</InputLabel>
                  <Select
                    labelId="create-shift-grades-label"
                    multiple
                    value={newShift.assigned_grade_ids}
                    label="Assign to Grades (Optional)"
                    onChange={(e) => {
                      const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                      setNewShift({ ...newShift, assigned_grade_ids: val });
                    }}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((gid) => {
                          const g = gradesData?.items?.find((item) => item.id === gid);
                          return <Chip key={gid} label={g?.name || gid} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {gradesData?.items?.map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setCreateShiftOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={!newShift.name || !newShift.start_time || !newShift.end_time || createShiftMutation.isPending}
                onClick={() => createShiftMutation.mutate(newShift)}
              >
                {createShiftMutation.isPending ? 'Creating...' : 'Create Shift'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog: Add Period */}
          <Dialog open={addPeriodOpen} onClose={() => setAddPeriodOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Add Period to Shift</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5} sx={{ mt: 1 }}>
                <TextField
                  label="Period Number"
                  type="number"
                  size="small"
                  fullWidth
                  value={newPeriod.number}
                  onChange={(e) => setNewPeriod({ ...newPeriod, number: parseInt(e.target.value) || 1 })}
                />
                <TextField
                  label="Period Name (optional)"
                  size="small"
                  fullWidth
                  value={newPeriod.name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                  placeholder="e.g. Period 1 or Morning Recess"
                />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <AppTimePicker
                      label="Period Start Time"
                      required
                      value={newPeriod.start_time}
                      onChange={(val) => setNewPeriod({ ...newPeriod, start_time: val })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <AppTimePicker
                      label="Period End Time"
                      required
                      value={newPeriod.end_time}
                      onChange={(val) => setNewPeriod({ ...newPeriod, end_time: val })}
                    />
                  </Grid>
                </Grid>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newPeriod.is_break}
                      onChange={(e) => setNewPeriod({ ...newPeriod, is_break: e.target.checked })}
                    />
                  }
                  label="Mark as Break / Recess Period"
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setAddPeriodOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={!newPeriod.start_time || !newPeriod.end_time || addPeriodMutation.isPending}
                onClick={() =>
                  addPeriodMutation.mutate({
                    shiftId: selectedShiftId,
                    data: newPeriod,
                  })
                }
              >
                {addPeriodMutation.isPending ? 'Adding...' : 'Add Period'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog: Assign Grades to Shift */}
          <Dialog
            open={assignGradesOpen}
            onClose={() => setAssignGradesOpen(false)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Assign Grades to {shiftToAssignGrades?.name}</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select all grades that operate under this shift. Any grade previously linked to this shift
                will be updated.
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="shift-assign-grades-modal-label">Assigned Grades</InputLabel>
                <Select
                  labelId="shift-assign-grades-modal-label"
                  multiple
                  value={selectedGradeIdsForShift}
                  label="Assigned Grades"
                  onChange={(e) => {
                    const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    setSelectedGradeIdsForShift(val);
                  }}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((gid) => {
                        const g = gradesData?.items?.find((item) => item.id === gid);
                        return <Chip key={gid} label={g?.name || gid} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {gradesData?.items?.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setAssignGradesOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={assignGradesToShiftMutation.isPending || !shiftToAssignGrades}
                onClick={() => {
                  if (shiftToAssignGrades) {
                    assignGradesToShiftMutation.mutate({
                      shiftId: shiftToAssignGrades.id,
                      gradeIds: selectedGradeIdsForShift,
                    });
                  }
                }}
              >
                {assignGradesToShiftMutation.isPending ? 'Saving...' : 'Save Assignments'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
