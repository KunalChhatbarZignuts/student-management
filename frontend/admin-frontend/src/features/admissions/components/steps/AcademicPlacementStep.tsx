import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import AppDatePicker from '@/components/ui/AppDatePicker';

export interface AcademicPlacementStepProps {
  academicYears: { id: string; name: string; is_current?: boolean }[];
  selectedAcademicYearId: string;
  onAcademicYearChange: (id: string) => void;
  grades: { id: string; name: string; level?: number; coordinator_name?: string | null }[];
  selectedGradeId: string;
  onGradeChange: (id: string) => void;
  loadingGrades: boolean;
  sections: { id: string; name: string; total_students?: number; class_capacity?: number | null }[];
  selectedSectionId: string;
  onSectionChange: (id: string) => void;
  loadingSections: boolean;
  admissionDate: string;
  onAdmissionDateChange: (val: string) => void;
  notes: string;
  onNotesChange: (val: string) => void;
  sectionTeacher?: {
    teacher_name?: string | null;
    employee_code?: string | null;
    assignment_type?: string | null;
  } | null;
  loadingSectionTeacher: boolean;
  selectedGrade?: { name: string; coordinator_name?: string | null } | null;
  selectedSection?: { name: string } | null;
  onNext: () => void;
  onBack: () => void;
}

export const AcademicPlacementStep: React.FC<AcademicPlacementStepProps> = ({
  academicYears,
  selectedAcademicYearId,
  onAcademicYearChange,
  grades,
  selectedGradeId,
  onGradeChange,
  loadingGrades,
  sections,
  selectedSectionId,
  onSectionChange,
  loadingSections,
  admissionDate,
  onAdmissionDateChange,
  notes,
  onNotesChange,
  sectionTeacher,
  loadingSectionTeacher,
  selectedGrade,
  selectedSection,
  onNext,
  onBack,
}) => {
  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <SchoolIcon color="primary" sx={{ fontSize: 28 }} />
        <div>
          <Typography variant="h6" fontWeight={700}>
            Step 3: Academic Placement & Class Teacher
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select the academic session, grade, and section.
          </Typography>
        </div>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth required>
            <InputLabel>Academic Year</InputLabel>
            <Select
              label="Academic Year"
              value={selectedAcademicYearId}
              onChange={(e) => onAcademicYearChange(e.target.value)}
            >
              {academicYears.map((ay) => (
                <MenuItem key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? ' (Current Active)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControl
            fullWidth
            required
            disabled={!selectedAcademicYearId || loadingGrades}
          >
            <InputLabel>Grade / Level</InputLabel>
            <Select
              label="Grade / Level"
              value={selectedGradeId}
              onChange={(e) => onGradeChange(e.target.value)}
            >
              {grades.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name} {g.level != null ? `(Level ${g.level})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControl
            fullWidth
            required
            disabled={!selectedGradeId || loadingSections}
          >
            <InputLabel>Section</InputLabel>
            <Select
              label="Section"
              value={selectedSectionId}
              onChange={(e) => onSectionChange(e.target.value)}
            >
              {sections.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  Section {s.name} ({s.total_students ?? 0} / {s.class_capacity ?? 'unlimited'} enrolled)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <AppDatePicker
            label="Official Admission Date"
            required
            value={admissionDate}
            onChange={onAdmissionDateChange}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Admission Notes / Remarks"
            fullWidth
            placeholder="e.g. Merit scholar, sibling discount..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </Grid>

        {selectedSectionId && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    display="block"
                    gutterBottom
                  >
                    SECTION CLASS TEACHER
                  </Typography>
                  {loadingSectionTeacher ? (
                    <CircularProgress size={24} />
                  ) : sectionTeacher && sectionTeacher.teacher_name ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CheckCircleIcon color="success" />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {sectionTeacher.teacher_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Emp Code: {sectionTeacher.employee_code || 'N/A'} • Assigned Role:{' '}
                          {sectionTeacher.assignment_type}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="warning" sx={{ py: 0.5 }}>
                      No active class teacher assigned to Section {selectedSection?.name}.
                    </Alert>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    display="block"
                    gutterBottom
                  >
                    GRADE COORDINATOR
                  </Typography>
                  {selectedGrade?.coordinator_name ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CheckCircleIcon color="primary" />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {selectedGrade.coordinator_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Coordinator for Grade {selectedGrade.name}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No coordinator currently configured for this grade level.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={onNext}
          endIcon={<ArrowForwardIcon />}
        >
          Continue to Fee Configuration
        </Button>
      </Box>
    </Card>
  );
};

