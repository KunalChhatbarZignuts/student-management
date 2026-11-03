'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';

import { teacherSubjectApi, teacherSubjectKeys } from '../subjectApi';
import { adminGradeApi, gradeKeys } from '@/features/grades/api';
import { adminTeacherApi, teacherKeys } from '../api';
import { SubjectItem } from '../types';
import CreateSubjectDialog from './CreateSubjectDialog';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

interface AssignSubjectDialogProps {
  open: boolean;
  onClose: () => void;
  initialTeacherId?: string;
  onSuccess?: () => void;
}

export default function AssignSubjectDialog({
  open,
  onClose,
  initialTeacherId,
  onSuccess,
}: AssignSubjectDialogProps) {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [teacherId, setTeacherId] = React.useState(initialTeacherId || '');
  const [academicYearId, setAcademicYearId] = React.useState('');
  const [gradeId, setGradeId] = React.useState('');
  const [sectionId, setSectionId] = React.useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = React.useState<string[]>([]);
  const [openCreateSubject, setOpenCreateSubject] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubjectCreated = (newSubject: SubjectItem) => {
    setSelectedSubjectIds((prev) => [...prev, newSubject.id]);
  };

  React.useEffect(() => {
    if (initialTeacherId) {
      setTeacherId(initialTeacherId);
    }
  }, [initialTeacherId]);

  // Fetch teachers
  const { data: teachersData } = useQuery({
    queryKey: teacherKeys.list({ limit: 100 }),
    queryFn: () => adminTeacherApi.listTeachers({ limit: 100 }),
    enabled: open,
  });

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: gradeKeys.academicYears,
    queryFn: adminGradeApi.listAcademicYears,
    enabled: open,
  });

  // Set default active academic year
  React.useEffect(() => {
    if (academicYears && academicYears.length > 0 && !academicYearId) {
      const activeYear = academicYears.find((y) => y.is_current);
      if (activeYear) {
        setAcademicYearId(activeYear.id);
      } else {
        setAcademicYearId(academicYears[0].id);
      }
    }
  }, [academicYears, academicYearId]);

  // Fetch grades
  const { data: gradesData } = useQuery({
    queryKey: gradeKeys.list({ size: 100, academic_year_id: academicYearId || undefined }),
    queryFn: () => adminGradeApi.listGrades({ size: 100, academic_year_id: academicYearId || undefined }),
    enabled: open,
  });

  // Fetch sections if grade selected
  const { data: sectionsData } = useQuery({
    queryKey: gradeKeys.sections(gradeId),
    queryFn: () => adminGradeApi.getGradeSections(gradeId),
    enabled: open && Boolean(gradeId),
  });

  // Fetch subjects
  const { data: subjects, isLoading: loadingSubjects } = useQuery({
    queryKey: teacherSubjectKeys.subjects(),
    queryFn: teacherSubjectApi.listSubjects,
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: teacherSubjectApi.assignSubjects,
    onSuccess: (res) => {
      showSnackbar(`Successfully assigned ${res.length} subject(s)!`, 'success');
      queryClient.invalidateQueries({ queryKey: teacherSubjectKeys.all });
      handleClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      const msg = formatErrorMessage(err);
      setErrorMessage(msg);
    },
  });

  const handleClose = () => {
    if (!initialTeacherId) setTeacherId('');
    setGradeId('');
    setSectionId('');
    setSelectedSubjectIds([]);
    setErrorMessage(null);
    onClose();
  };

  const handleSubjectChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedSubjectIds(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!teacherId) {
      setErrorMessage('Please select a teacher.');
      return;
    }
    if (selectedSubjectIds.length === 0) {
      setErrorMessage('Please select at least one subject to assign.');
      return;
    }

    assignMutation.mutate({
      teacher_id: teacherId,
      academic_year_id: academicYearId || undefined,
      assignments: selectedSubjectIds.map((sId) => ({
        subject_id: sId,
        academic_year_id: academicYearId || undefined,
        grade_id: gradeId || undefined,
        section_id: sectionId || undefined,
      })),
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Assign Subject(s) to Teacher
        </DialogTitle>
        <DialogContent dividers>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Teacher Select */}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Teacher *"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={Boolean(initialTeacherId)}
                size="small"
              >
                <MenuItem value="" disabled>
                  Select a Teacher
                </MenuItem>
                {teachersData?.items?.map((u: any) => {
                  const teacher = u.teacher;
                  if (!teacher) return null;
                  return (
                    <MenuItem key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name} ({teacher.employee_code || u.email}) - {teacher.department}
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>

            {/* Academic Year */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Academic Year"
                value={academicYearId}
                onChange={(e) => {
                  setAcademicYearId(e.target.value);
                  setGradeId('');
                  setSectionId('');
                }}
                size="small"
              >
                <MenuItem value="">Any / General</MenuItem>
                {academicYears?.map((ay) => (
                  <MenuItem key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_current ? '(Current)' : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Grade Select */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Grade (Optional)"
                value={gradeId}
                onChange={(e) => {
                  setGradeId(e.target.value);
                  setSectionId('');
                }}
                size="small"
              >
                <MenuItem value="">None / All Grades</MenuItem>
                {gradesData?.items?.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Section Select */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Section (Optional)"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!gradeId}
                size="small"
                helperText={!gradeId ? 'Select a Grade first' : undefined}
              >
                <MenuItem value="">None / All Sections</MenuItem>
                {sectionsData?.map((sec) => (
                  <MenuItem key={sec.id} value={sec.id}>
                    Section {sec.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Multi-Select Subjects */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Curriculum Subjects to Assign
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={() => setOpenCreateSubject(true)}
                  sx={{ textTransform: 'none', py: 0 }}
                >
                  Create New Subject
                </Button>
              </Box>
              <FormControl fullWidth size="small">
                <InputLabel id="subjects-select-label">Subjects to Assign *</InputLabel>
                <Select
                  labelId="subjects-select-label"
                  multiple
                  value={selectedSubjectIds}
                  onChange={handleSubjectChange}
                  input={<OutlinedInput label="Subjects to Assign *" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((val) => {
                        const s = subjects?.find((sub) => sub.id === val);
                        return <Chip key={val} label={s ? `${s.name} (${s.code})` : val} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {loadingSubjects ? (
                    <MenuItem disabled>Loading subjects...</MenuItem>
                  ) : !subjects || subjects.length === 0 ? (
                    <MenuItem disabled>No subjects found</MenuItem>
                  ) : (
                    subjects.map((sub) => (
                      <MenuItem key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code}) - {sub.department}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={assignMutation.isPending}
            startIcon={assignMutation.isPending ? <CircularProgress size={16} /> : null}
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign Subjects'}
          </Button>
        </DialogActions>
      </form>

      {/* Inline Create Subject Dialog */}
      <CreateSubjectDialog
        open={openCreateSubject}
        onClose={() => setOpenCreateSubject(false)}
        onCreated={handleSubjectCreated}
      />
    </Dialog>
  );
}
