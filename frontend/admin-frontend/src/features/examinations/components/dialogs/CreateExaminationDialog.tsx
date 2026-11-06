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

import { CreateExaminationPayload } from '../../types';

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateExaminationPayload) => Promise<void>;
  isSubmitting: boolean;
}

export const CreateExaminationDialog: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [name, setName] = React.useState('');
  const [examType, setExamType] = React.useState('UNIT_TEST');
  const [academicYearId, setAcademicYearId] = React.useState('');
  const [term, setTerm] = React.useState('Term 1');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await apiClient.get<AcademicYear[]>('/academic-years');
      return res.data;
    },
    enabled: open,
  });

  React.useEffect(() => {
    if (academicYears && academicYears.length > 0 && !academicYearId) {
      const current = academicYears.find((y) => y.is_current) || academicYears[0];
      setAcademicYearId(current.id);
    }
  }, [academicYears, academicYearId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Examination title is required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Both start and end dates are required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be earlier than start date.');
      return;
    }
    if (!academicYearId) {
      setError('Please select an academic year.');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        exam_type: examType,
        academic_year_id: academicYearId,
        term,
        start_date: startDate,
        end_date: endDate,
        description: description.trim() || undefined,
        grading_scale_name: 'Default 10-Point Scale',
      });
      // Reset form
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create examination.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>Schedule New Examination</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Examination Title"
                placeholder="e.g. Term 1 - Unit Test 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                autoFocus
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Examination Type"
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                fullWidth
                required
              >
                <MenuItem value="UNIT_TEST">Unit Test</MenuItem>
                <MenuItem value="MID_TERM">Mid-Term Examination</MenuItem>
                <MenuItem value="FINAL">Final Examination</MenuItem>
                <MenuItem value="QUARTERLY">Quarterly Examination</MenuItem>
                <MenuItem value="PRELIMINARY">Preliminary Exam</MenuItem>
                <MenuItem value="PRACTICAL">Practical Assessment</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Academic Year"
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                fullWidth
                required
              >
                {academicYears?.map((y) => (
                  <MenuItem key={y.id} value={y.id}>
                    {y.name} {y.is_current ? '(Current)' : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Term"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                fullWidth
                required
              >
                <MenuItem value="Term 1">Term 1</MenuItem>
                <MenuItem value="Term 2">Term 2</MenuItem>
                <MenuItem value="Term 3">Term 3</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Instructions / Description"
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Offline physical examination notes, guidelines, or venue details..."
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
            Create Examination
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

