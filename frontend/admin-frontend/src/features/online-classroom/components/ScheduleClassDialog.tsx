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
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherOnlineClassApi, adminOnlineClassApi, onlineClassroomKeys } from '../api';
import { CreateOnlineClassPayload } from '../types';
import { adminTeacherApi } from '@/features/teachers/api';

interface ScheduleClassDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isAdmin?: boolean;
}

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

  // Fetch available students for selection
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: onlineClassroomKeys.students(),
    queryFn: () => teacherOnlineClassApi.searchStudents(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (payload: any) =>
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

    const payload: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      scheduled_date: scheduledDate,
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      expected_duration_minutes: duration,
      student_ids: selectedStudents.map((s) => s.id),
      allow_student_mic: allowMic,
      allow_student_cam: allowCam,
      allow_student_chat: allowChat,
      allow_student_whiteboard: allowWhiteboard,
      ...(isAdmin && selectedTeacher ? { teacher_id: selectedTeacher.id } : {}),
    };

    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth disableRestoreFocus>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 600 }}>Schedule New Online Class</DialogTitle>
        <DialogContent dividers>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
              {errorMsg}
            </Alert>
          )}

          <Grid container spacing={2.5}>
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
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assigned Instructor (Teacher)"
                      required
                      placeholder="Search and assign a teacher to lead this class..."
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
              <TextField
                label="Date"
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Start Time"
                type="time"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Duration"
                fullWidth
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                <MenuItem value={30}>30 Minutes</MenuItem>
                <MenuItem value={45}>45 Minutes</MenuItem>
                <MenuItem value={60}>60 Minutes (1 Hour)</MenuItem>
                <MenuItem value={90}>90 Minutes (1.5 Hours)</MenuItem>
                <MenuItem value={120}>120 Minutes (2 Hours)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Enrolled Students (Independent Selection)
              </Typography>
              <Autocomplete
                multiple
                options={students}
                loading={loadingStudents}
                getOptionLabel={(option) =>
                  `${option.student_code} - ${option.first_name} ${option.last_name} ${option.class_name ? `(${option.class_name})` : ''}`
                }
                value={selectedStudents}
                onChange={(_, newValue) => setSelectedStudents(newValue)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      label={`${option.student_code} (${option.first_name})`}
                      size="small"
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search and select students to invite..."
                    InputProps={{
                      ...params.InputProps,
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
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit" disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={24} color="inherit" /> : 'Schedule Class'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
