'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentsApi } from '../api';
import { apiClient } from '@/lib/axios';

interface BulkEnrollmentDialogProps {
  open: boolean;
  onClose: () => void;
  selectedStudentIds: string[];
  onSuccess: () => void;
}

export default function BulkEnrollmentDialog({
  open,
  onClose,
  selectedStudentIds,
  onSuccess,
}: BulkEnrollmentDialogProps) {
  const queryClient = useQueryClient();
  const [academicYearId, setAcademicYearId] = React.useState('');
  const [gradeId, setGradeId] = React.useState('');
  const [sectionId, setSectionId] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Fetch Academic Years
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years-all'],
    queryFn: async () => {
      const res = await apiClient.get<any[]>('/admin/academic-years');
      return res.data || [];
    },
    enabled: open,
  });

  // Fetch Grades (optionally filtered by academic year)
  const { data: grades = [] } = useQuery({
    queryKey: ['grades-list-all', academicYearId],
    queryFn: async () => {
      const params = new URLSearchParams({ size: '100' });
      if (academicYearId) params.append('academic_year_id', academicYearId);
      const res = await apiClient.get<any>(`/admin/grades?${params.toString()}`);
      return res.data?.items || (Array.isArray(res.data) ? res.data : []);
    },
    enabled: open,
  });

  // Fetch Sections for selected grade
  const { data: sections = [] } = useQuery({
    queryKey: ['sections-for-grade', gradeId],
    queryFn: async () => {
      if (!gradeId) return [];
      const res = await apiClient.get<any>(`/admin/grades/${gradeId}/sections`);
      return res.data?.items || (Array.isArray(res.data) ? res.data : []);
    },
    enabled: !!gradeId,
  });

  // Default Academic Year to currently active year
  React.useEffect(() => {
    if (academicYears.length > 0 && !academicYearId) {
      const current = academicYears.find((ay: any) => ay.is_current);
      setAcademicYearId(current ? current.id : academicYears[0].id);
    }
  }, [academicYears, academicYearId]);

  const selectedSectionObj = sections.find((s: any) => s.id === sectionId);

  const bulkMutation = useMutation({
    mutationFn: enrollmentsApi.bulkEnroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-students'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.detail || 'Failed to complete bulk enrollment.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!academicYearId || !gradeId || !sectionId) {
      setErrorMessage('Please select Academic Year, Grade, and Section.');
      return;
    }
    bulkMutation.mutate({
      student_ids: selectedStudentIds,
      academic_year_id: academicYearId,
      grade_id: gradeId,
      section_id: sectionId,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} disableRestoreFocus maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Bulk Assign Students to Section ({selectedStudentIds.length} Selected)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                You are about to assign <strong>{selectedStudentIds.length}</strong> admitted student(s) to a class section.
                The system will automatically allocate sequential roll numbers.
              </Typography>
            </Box>

            <FormControl fullWidth required size="small">
              <InputLabel id="bulk-academic-year-label">Academic Year</InputLabel>
              <Select
                labelId="bulk-academic-year-label"
                value={academicYearId}
                label="Academic Year"
                onChange={(e) => {
                  setAcademicYearId(e.target.value);
                  setGradeId('');
                  setSectionId('');
                }}
              >
                {academicYears.map((ay: any) => (
                  <MenuItem key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_current ? '(Current Active)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required size="small" disabled={!academicYearId}>
              <InputLabel id="bulk-grade-label">Target Grade</InputLabel>
              <Select
                labelId="bulk-grade-label"
                value={gradeId}
                label="Target Grade"
                onChange={(e) => {
                  setGradeId(e.target.value);
                  setSectionId('');
                }}
              >
                {grades.map((g: any) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name} ({g.code || 'Grade'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required size="small" disabled={!gradeId}>
              <InputLabel id="bulk-section-label">Target Section</InputLabel>
              <Select
                labelId="bulk-section-label"
                value={sectionId}
                label="Target Section"
                onChange={(e) => setSectionId(e.target.value)}
              >
                {sections.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} (Capacity: {s.class_capacity ?? 'No limit'}, Enrolled: {s.total_students ?? 0})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedSectionObj && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Section Capacity:
                </Typography>
                <Chip
                  label={`${selectedSectionObj.total_students || 0} / ${selectedSectionObj.class_capacity || 30}`}
                  color="info"
                  size="small"
                  variant="outlined"
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={bulkMutation.isPending} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={bulkMutation.isPending || !sectionId}
            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 130 }}
          >
            {bulkMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Confirm Assignment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

