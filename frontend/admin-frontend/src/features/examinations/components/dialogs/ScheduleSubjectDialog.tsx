import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

import { CreateSchedulePayload, Examination } from '../../types';

interface GradeItem {
  id: string;
  name: string;
}

interface SectionItem {
  id: string;
  name: string;
  grade_id: string;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  examination: Examination;
  onSubmit: (payload: CreateSchedulePayload) => Promise<void>;
  isSubmitting: boolean;
}

export const ScheduleSubjectDialog: React.FC<Props> = ({
  open,
  onClose,
  examination,
  onSubmit,
  isSubmitting,
}) => {
  const [gradeId, setGradeId] = React.useState('');
  const [sectionId, setSectionId] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const [examDate, setExamDate] = React.useState(examination.start_date || '');
  const [startTime, setStartTime] = React.useState('09:30');
  const [endTime, setEndTime] = React.useState('11:30');
  const [maxMarks, setMaxMarks] = React.useState(100);
  const [passMarks, setPassMarks] = React.useState(35);
  const [roomNumber, setRoomNumber] = React.useState('Main Hall');
  const [instructions, setInstructions] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  // Fetch Grades
  const { data: grades } = useQuery({
    queryKey: ['grades-list'],
    queryFn: async () => {
      const res = await apiClient.get<GradeItem[]>('/grades');
      return res.data;
    },
    enabled: open,
  });

  // Fetch Sections
  const { data: sections } = useQuery({
    queryKey: ['sections-list'],
    queryFn: async () => {
      const res = await apiClient.get<SectionItem[]>('/sections');
      return res.data;
    },
    enabled: open,
  });

  // Fetch Subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const res = await apiClient.get<SubjectItem[]>('/subjects');
      return res.data;
    },
    enabled: open,
  });

  // Filter sections by selected grade
  const filteredSections = React.useMemo(() => {
    if (!sections || !gradeId) return [];
    return sections.filter((s) => s.grade_id === gradeId);
  }, [sections, gradeId]);

  React.useEffect(() => {
    if (grades && grades.length > 0 && !gradeId) {
      setGradeId(grades[0].id);
    }
  }, [grades, gradeId]);

  React.useEffect(() => {
    if (filteredSections.length > 0) {
      setSectionId(filteredSections[0].id);
    } else {
      setSectionId('');
    }
  }, [filteredSections]);

  React.useEffect(() => {
    if (subjects && subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!gradeId || !sectionId || !subjectId) {
      setError('Please select Grade, Section, and Subject.');
      return;
    }
    if (!examDate) {
      setError('Examination date is required.');
      return;
    }
    if (maxMarks <= 0 || passMarks < 0 || passMarks > maxMarks) {
      setError('Please enter valid maximum and passing marks (Pass marks ≤ Max marks).');
      return;
    }

    try {
      await onSubmit({
        examination_id: examination.id,
        grade_id: gradeId,
        section_id: sectionId,
        subject_id: subjectId,
        exam_date: examDate,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        max_marks: Number(maxMarks),
        pass_marks: Number(passMarks),
        room_number: roomNumber.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create schedule slot.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Add Subject Examination Slot • {examination.name}
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Grade"
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                fullWidth
                required
              >
                {grades?.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Section"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                fullWidth
                required
                disabled={!filteredSections.length}
              >
                {filteredSections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                select
                label="Subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                fullWidth
                required
              >
                {subjects?.map((sub) => (
                  <MenuItem key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Exam Date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                helperText={`Range: ${examination.start_date} to ${examination.end_date}`}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Max Marks"
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Passing Marks"
                type="number"
                value={passMarks}
                onChange={(e) => setPassMarks(Number(e.target.value))}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Room / Venue"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Candidate Instructions"
                placeholder="Specific materials allowed, reporting rules..."
                multiline
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} /> : null}
          >
            Save Slot
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

