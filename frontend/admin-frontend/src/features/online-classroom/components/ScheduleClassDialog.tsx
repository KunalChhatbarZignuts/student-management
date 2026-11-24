import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import MeetingRoomOutlined from '@mui/icons-material/MeetingRoomOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import AccessTime from '@mui/icons-material/AccessTime';
import CalendarToday from '@mui/icons-material/CalendarToday';
import PersonOutline from '@mui/icons-material/PersonOutline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppDatePicker from '@/components/ui/AppDatePicker';
import AppTimePicker from '@/components/ui/AppTimePicker';
import { SmoothDialogTransition, SpringPill, PulseLiveBadge } from '@/components/ui/animated';
import { teacherOnlineClassApi, adminOnlineClassApi, onlineClassroomKeys } from '../api';
import { CreateOnlineClassPayload } from '../types';
import { adminTeacherApi } from '@/features/teachers/api';
import { adminGradeApi } from '@/features/grades/api';
import { Grade, Section } from '@/features/grades/types';

interface ScheduleClassDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isAdmin?: boolean;
}

const DURATION_PRESETS = [
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '60m (1h)' },
  { value: 90, label: '90m' },
  { value: 120, label: '120m (2h)' },
];

export default function ScheduleClassDialog({ open, onClose, onSuccess, isAdmin = false }: ScheduleClassDialogProps) {
  const queryClient = useQueryClient();

  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(getDefaultDate());
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState<number>(60);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Array<{ id: string; student_code: string; first_name: string; last_name: string; class_name?: string }>>([]);
  const [allowMic, setAllowMic] = useState(true);
  const [allowCam, setAllowCam] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [allowWhiteboard, setAllowWhiteboard] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch available teachers if in admin mode
  const { data: teachersData, isLoading: loadingTeachers } = useQuery({
    queryKey: ['admin-teachers-selection'],
    queryFn: () => adminTeacherApi.listTeachers({ limit: 100 }),
    enabled: Boolean(open && isAdmin),
  });
  const teachers = teachersData?.items || [];

  // Fetch available grades
  const { data: gradesData, isLoading: loadingGrades } = useQuery({
    queryKey: ['admin-grades-list', { status: 'active' }],
    queryFn: () => adminGradeApi.listGrades({ size: 100, status: 'active' }),
    enabled: open,
  });
  const grades = gradesData?.items || [];

  // Fetch sections when a grade is selected
  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ['grade-sections', selectedGrade?.id],
    queryFn: () => (selectedGrade?.id ? adminGradeApi.getGradeSections(selectedGrade.id) : Promise.resolve([])),
    enabled: Boolean(open && selectedGrade?.id),
  });

  // Fetch available students filtered by selected grade and section
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: onlineClassroomKeys.students({
      grade_id: selectedGrade?.id,
      section_id: selectedSection?.id,
    }),
    queryFn: () =>
      teacherOnlineClassApi.searchStudents({
        grade_id: selectedGrade?.id,
        section_id: selectedSection?.id,
      }),
    enabled: open,
  });

  const isAllSelected = students.length > 0 && selectedStudents.length === students.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents([...students]);
    }
  };

  const mutation = useMutation({
    mutationFn: (payload: CreateOnlineClassPayload) =>
      isAdmin ? adminOnlineClassApi.createClass(payload) : teacherOnlineClassApi.createClass(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onlineClassroomKeys.all });
      onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Failed to schedule class. Please try again.');
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setScheduledDate(getDefaultDate());
    setStartTime('10:00');
    setDuration(60);
    setSelectedTeacher(null);
    setSelectedGrade(null);
    setSelectedSection(null);
    setSelectedStudents([]);
    setAllowMic(true);
    setAllowCam(true);
    setAllowChat(true);
    setAllowWhiteboard(false);
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a class title');
      return;
    }
    if (isAdmin && !selectedTeacher) {
      setErrorMsg('Please select an instructor to lead this class');
      return;
    }
    if (!selectedGrade && selectedStudents.length === 0) {
      setErrorMsg('Please select a Grade or choose specific students to invite');
      return;
    }

    const payload: CreateOnlineClassPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      scheduled_date: scheduledDate,
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      expected_duration_minutes: duration,
      grade_id: selectedGrade?.id || undefined,
      section_id: selectedSection?.id || undefined,
      student_ids: selectedStudents.map((s) => s.id),
      allow_student_mic: allowMic,
      allow_student_cam: allowCam,
      allow_student_chat: allowChat,
      allow_student_whiteboard: allowWhiteboard,
      settings: {},
      ...(isAdmin && selectedTeacher ? { teacher_id: selectedTeacher.id } : {}),
    };

    mutation.mutate(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableRestoreFocus
      TransitionComponent={SmoothDialogTransition}
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
        sx: {
          maxHeight: 'calc(100vh - 48px)',
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2.5,
          overflow: 'hidden',
          my: { xs: 1, sm: 2 },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, py: 1.75, px: 3, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        Schedule New Online Class
      </DialogTitle>
      <DialogContent sx={{ overflowY: 'auto', flex: '1 1 auto', p: { xs: 2, sm: 2.5 } }}>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
              {errorMsg}
            </Alert>
          )}

          <Grid container spacing={2}>
            {isAdmin && (
              <Grid item xs={12}>
                <Autocomplete
                  options={teachers}
                  loading={loadingTeachers}
                  getOptionLabel={(option: any) =>
                    `${option.first_name} ${option.last_name} (${option.teacher_code || option.email})`
                  }
                  value={selectedTeacher}
                  onChange={(_, newValue) => setSelectedTeacher(newValue)}
                  renderOption={(props, option: any) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={option.id} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                        <Avatar sx={{ width: 30, height: 30, fontSize: '0.8rem', bgcolor: 'primary.main', color: '#fff' }}>
                          {option.first_name?.[0]}{option.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {option.first_name} {option.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.department ? `${option.department} • ` : ''}{option.teacher_code || option.email}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assigned Instructor (Teacher)"
                      required
                      placeholder="Search and assign a teacher to lead this class..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <PersonOutline fontSize="small" color="action" />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                label="Class Title"
                fullWidth
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Mathematics - Trigonometry Live Problem Solving"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Overview / Description"
                fullWidth
                multiline
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional topics covered, materials needed, or prerequisites"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <AppDatePicker
                label="Class Date"
                value={scheduledDate}
                onChange={(val) => setScheduledDate(val || getDefaultDate())}
                minDate={new Date().toISOString().split('T')[0]}
                required
                size="medium"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <AppTimePicker
                label="Start Time"
                value={startTime}
                onChange={(val) => setStartTime(val || '10:00')}
                required
                size="medium"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Duration"
                fullWidth
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTime fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value={30}>30 Minutes</MenuItem>
                <MenuItem value={45}>45 Minutes</MenuItem>
                <MenuItem value={60}>60 Minutes (1 Hour)</MenuItem>
                <MenuItem value={90}>90 Minutes (1.5 Hours)</MenuItem>
                <MenuItem value={120}>120 Minutes (2 Hours)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                  p: 1.25,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime fontSize="small" color="primary" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Quick Select Duration:
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
                  {DURATION_PRESETS.map((p) => {
                    const isSelected = duration === p.value;
                    return (
                      <SpringPill
                        key={p.value}
                        label={p.label}
                        size="small"
                        selected={isSelected}
                        onClick={() => setDuration(p.value)}
                      />
                    );
                  })}
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2.5,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolOutlined color="primary" fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Target Audience & Class Enrollment
                    </Typography>
                  </Box>
                  {selectedGrade && (
                    <PulseLiveBadge
                      variant="invited"
                      label={
                        selectedStudents.length > 0
                          ? `${selectedStudents.length} Students Selected`
                          : selectedSection
                          ? `All Students in ${selectedGrade.name} (${selectedSection.name})`
                          : `All Students in ${selectedGrade.name}`
                      }
                    />
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={grades}
                      loading={loadingGrades}
                      getOptionLabel={(option) => option.name + (option.code ? ` (${option.code})` : '')}
                      value={selectedGrade}
                      onChange={(_, newValue) => {
                        setSelectedGrade(newValue);
                        setSelectedSection(null);
                        setSelectedStudents([]);
                      }}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props;
                        return (
                          <Box component="li" key={option.id} {...otherProps} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <SchoolOutlined fontSize="small" color="primary" />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.name}</Typography>
                                {option.code && <Typography variant="caption" color="text.secondary">Code: {option.code}</Typography>}
                              </Box>
                            </Box>
                            <Chip size="small" label={`Level ${option.level}`} sx={{ fontSize: '0.7rem', height: 20 }} />
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Grade / Class (Optional)"
                          placeholder="Select Grade to filter or invite..."
                          helperText={selectedGrade ? `Selected: ${selectedGrade.name}` : 'Optional: Filter students by grade'}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <SchoolOutlined fontSize="small" color={selectedGrade ? 'primary' : 'action'} />
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={sections}
                      loading={loadingSections}
                      disabled={!selectedGrade}
                      getOptionLabel={(option) => option.name}
                      value={selectedSection}
                      onChange={(_, newValue) => {
                        setSelectedSection(newValue);
                        setSelectedStudents([]);
                      }}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props;
                        return (
                          <Box component="li" key={option.id} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                            <MeetingRoomOutlined fontSize="small" color="primary" />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Section {option.name}</Typography>
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Section (Optional)"
                          placeholder={selectedGrade ? 'Select Section...' : 'Select a Grade first'}
                          helperText={
                            !selectedGrade
                              ? 'Select a Grade first to filter by Section'
                              : selectedSection
                              ? `Section: ${selectedSection.name}`
                              : 'Optional: Filter by specific section'
                          }
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <MeetingRoomOutlined fontSize="small" color={selectedSection ? 'primary' : 'action'} />
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Specific Students (Optional)
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {students.length > 0 && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={handleToggleSelectAll}
                            sx={{ fontSize: '0.75rem', py: 0.2, textTransform: 'none', fontWeight: 600 }}
                          >
                            {isAllSelected ? 'Deselect All' : `Select All (${students.length})`}
                          </Button>
                        )}
                        {selectedStudents.length > 0 && !isAllSelected && (
                          <Button
                            size="small"
                            color="inherit"
                            onClick={() => setSelectedStudents([])}
                            sx={{ fontSize: '0.75rem', py: 0.2, textTransform: 'none' }}
                          >
                            Clear ({selectedStudents.length})
                          </Button>
                        )}
                      </Stack>
                    </Box>
                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      options={students}
                      loading={loadingStudents}
                      getOptionLabel={(option) =>
                        `${option.student_code} - ${option.first_name} ${option.last_name} ${option.class_name ? `(${option.class_name})` : ''}`
                      }
                      value={selectedStudents}
                      onChange={(_, newValue) => setSelectedStudents(newValue)}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      renderOption={(props, option, { selected }) => {
                        const { key, ...otherProps } = props;
                        return (
                          <Box component="li" key={option.id} {...otherProps} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Checkbox size="small" checked={selected} sx={{ p: 0.5 }} />
                              <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                                {option.first_name?.[0]}{option.last_name?.[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.first_name} {option.last_name}</Typography>
                                <Typography variant="caption" color="text.secondary">{option.student_code}</Typography>
                              </Box>
                            </Box>
                            {option.class_name && (
                              <Chip size="small" variant="outlined" label={option.class_name} sx={{ fontSize: '0.7rem', height: 20 }} />
                            )}
                          </Box>
                        );
                      }}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            {...getTagProps({ index })}
                            key={option.id}
                            avatar={
                              <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem' }}>
                                {option.first_name?.[0]}
                              </Avatar>
                            }
                            label={`${option.first_name} ${option.last_name}`}
                            size="small"
                            variant="outlined"
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={
                            selectedStudents.length === 0
                              ? selectedGrade
                                ? `All students in ${selectedGrade.name}${selectedSection ? ` - ${selectedSection.name}` : ''} will be enrolled (or pick specific students)`
                                : 'Search and select specific students...'
                              : 'Select more students...'
                          }
                          helperText={
                            selectedGrade
                              ? selectedStudents.length > 0
                                ? `Enrolling ${selectedStudents.length} selected student(s) from ${selectedGrade.name}.`
                                : `Leaving this empty will automatically enroll all students in ${selectedGrade.name}${selectedSection ? ` (${selectedSection.name})` : ''}.`
                              : 'Search and select individual students to enroll in this class.'
                          }
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <InputAdornment position="start">
                                  <PeopleAltOutlined fontSize="small" color="action" />
                                </InputAdornment>
                                {params.InputProps.startAdornment}
                              </>
                            ),
                            endAdornment: (
                              <>
                                {loadingStudents ? <CircularProgress size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Participant Permissions & Controls
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={<Switch checked={allowMic} onChange={(e) => setAllowMic(e.target.checked)} color="primary" />}
                      label="Allow Student Microphones"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={<Switch checked={allowCam} onChange={(e) => setAllowCam(e.target.checked)} color="primary" />}
                      label="Allow Student Cameras"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={<Switch checked={allowChat} onChange={(e) => setAllowChat(e.target.checked)} color="primary" />}
                      label="Enable In-Class Chat"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={<Switch checked={allowWhiteboard} onChange={(e) => setAllowWhiteboard(e.target.checked)} color="primary" />}
                      label="Allow Whiteboard Collaboration"
                    />
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default', flexShrink: 0 }}>
          <Button onClick={handleClose} color="inherit" disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={24} color="inherit" /> : 'Schedule Class'}
          </Button>
        </DialogActions>
    </Dialog>
  );
}
