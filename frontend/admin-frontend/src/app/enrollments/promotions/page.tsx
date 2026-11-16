'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { enrollmentsApi } from '@/features/enrollments/api';
import {
  PromotionPreviewResponse,
  StudentPromotionDecision,
} from '@/features/enrollments/types';
import { apiClient } from '@/lib/axios';

const steps = ['Select Grade Levels', 'Review & Assign Sections', 'Confirmation Summary'];

export default function AcademicPromotionWizardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = React.useState(0);

  // Form State
  const [sourceYearId, setSourceYearId] = React.useState('');
  const [targetYearId, setTargetYearId] = React.useState('');
  const [sourceGradeId, setSourceGradeId] = React.useState('');
  const [targetGradeId, setTargetGradeId] = React.useState('');
  const [decisions, setDecisions] = React.useState<Record<string, StudentPromotionDecision>>({});
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Queries
  const { data: years = [] } = useQuery({
    queryKey: ['academic-years-all'],
    queryFn: async () => {
      const res = await apiClient.get<any[]>('/academic-years');
      return res.data || [];
    },
  });

  const { data: grades = [] } = useQuery({
    queryKey: ['grades-list-all'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/grades?size=100');
      return res.data?.items || [];
    },
  });

  // Default selection
  React.useEffect(() => {
    if (years.length >= 2) {
      const cur = years.find((y: any) => y.is_current) || years[0];
      const nxt = years.find((y: any) => y.id !== cur.id) || years[1];
      setSourceYearId(cur.id);
      setTargetYearId(nxt.id);
    }
  }, [years]);

  // Preview Query
  const previewMutation = useMutation({
    mutationFn: enrollmentsApi.previewPromotions,
    onSuccess: (data: PromotionPreviewResponse) => {
      const initialDecisions: Record<string, StudentPromotionDecision> = {};
      const defaultSecId = data.target_sections[0]?.section_id || '';
      data.students.forEach((s) => {
        initialDecisions[s.student_id] = {
          student_id: s.student_id,
          action: s.suggested_action as any,
          target_section_id: defaultSecId,
          reason: s.exam_result === 'PASS' ? 'Promoted on academic merit' : undefined,
        };
      });
      setDecisions(initialDecisions);
      setActiveStep(1);
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.detail || 'Failed to generate promotion preview.');
    },
  });

  // Execute Mutation
  const executeMutation = useMutation({
    mutationFn: enrollmentsApi.executePromotions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-students'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setActiveStep(2);
    },
    onError: (err: any) => {
      setErrorMessage(err?.response?.data?.detail || 'Failed to execute promotions.');
    },
  });

  const handleFetchPreview = () => {
    setErrorMessage(null);
    if (!sourceYearId || !targetYearId || !sourceGradeId || !targetGradeId) {
      setErrorMessage('Please select source and target academic years and grade levels.');
      return;
    }
    previewMutation.mutate({
      source_academic_year_id: sourceYearId,
      source_grade_id: sourceGradeId,
      target_academic_year_id: targetYearId,
      target_grade_id: targetGradeId,
    });
  };

  const handleExecute = () => {
    setErrorMessage(null);
    const decisionList = Object.values(decisions);
    if (decisionList.length === 0) {
      setErrorMessage('No student decisions available to execute.');
      return;
    }
    executeMutation.mutate({
      source_academic_year_id: sourceYearId,
      target_academic_year_id: targetYearId,
      target_grade_id: targetGradeId,
      decisions: decisionList,
    });
  };

  return (
    <RequireRole roles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Academic Year Promotion Wizard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Step-by-step cohort promotion and academic year transition.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/enrollments')}
              sx={{ textTransform: 'none' }}
            >
              Back to Enrollments
            </Button>
          </Box>

          {/* Stepper */}
          <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Stepper activeStep={activeStep}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}

          {/* Step 0: Select Source & Destination */}
          {activeStep === 0 && (
            <Paper elevation={0} variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Configure Promotion Cohort
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select the current source academic cohort and the destination academic year and grade level.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="source-year-label">Source Academic Year</InputLabel>
                    <Select
                      labelId="source-year-label"
                      value={sourceYearId}
                      label="Source Academic Year"
                      onChange={(e) => setSourceYearId(e.target.value)}
                    >
                      {years.map((y: any) => (
                        <MenuItem key={y.id} value={y.id}>
                          {y.name} {y.is_current ? '(Current Active)' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="target-year-label">Destination Academic Year</InputLabel>
                    <Select
                      labelId="target-year-label"
                      value={targetYearId}
                      label="Destination Academic Year"
                      onChange={(e) => setTargetYearId(e.target.value)}
                    >
                      {years.map((y: any) => (
                        <MenuItem key={y.id} value={y.id}>
                          {y.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="source-grade-label">Source Grade</InputLabel>
                    <Select
                      labelId="source-grade-label"
                      value={sourceGradeId}
                      label="Source Grade"
                      onChange={(e) => setSourceGradeId(e.target.value)}
                    >
                      {grades.map((g: any) => (
                        <MenuItem key={g.id} value={g.id}>
                          {g.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="target-grade-label">Destination Grade (e.g. Next Level)</InputLabel>
                    <Select
                      labelId="target-grade-label"
                      value={targetGradeId}
                      label="Destination Grade (e.g. Next Level)"
                      onChange={(e) => setTargetGradeId(e.target.value)}
                    >
                      {grades.map((g: any) => (
                        <MenuItem key={g.id} value={g.id}>
                          {g.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleFetchPreview}
                  disabled={previewMutation.isPending || !sourceGradeId || !targetGradeId}
                  sx={{ textTransform: 'none', fontWeight: 600, minWidth: 140, borderRadius: 2 }}
                >
                  {previewMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Load Candidate Roster'}
                </Button>
              </Box>
            </Paper>
          )}

          {/* Step 1: Review Roster & Destination Sections */}
          {activeStep === 1 && previewMutation.data && (
            <Paper elevation={0} variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Review Candidates: {previewMutation.data.source_grade_name} → {previewMutation.data.target_grade_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Verify examination eligibility and assign destination sections.
                  </Typography>
                </Box>
                <Chip
                  label={`${previewMutation.data.students.length} Student Candidates`}
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <TableContainer sx={{ maxHeight: 460, my: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Roll #</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Current Section</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Exam Result</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Destination Section</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewMutation.data.students.map((st) => {
                      const dec = decisions[st.student_id] || {
                        student_id: st.student_id,
                        action: 'PROMOTE',
                        target_section_id: previewMutation.data?.target_sections[0]?.section_id || '',
                      };
                      return (
                        <TableRow key={st.student_id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{st.current_roll_no}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {st.first_name} {st.last_name}
                            <Typography variant="caption" color="text.secondary" display="block">
                              {st.student_code}
                            </Typography>
                          </TableCell>
                          <TableCell>{st.current_section_name || '—'}</TableCell>
                          <TableCell>
                            {st.exam_result === 'PASS' ? (
                              <Chip label={`PASS (${st.exam_percentage || 0}%)`} color="success" size="small" sx={{ fontWeight: 600 }} />
                            ) : st.exam_result === 'FAIL' ? (
                              <Chip label="FAIL" color="error" size="small" sx={{ fontWeight: 600 }} />
                            ) : (
                              <Chip label="NO EXAM" size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              value={dec.action}
                              onChange={(e) =>
                                setDecisions({
                                  ...decisions,
                                  [st.student_id]: { ...dec, action: e.target.value as any },
                                })
                              }
                              sx={{ minWidth: 120 }}
                            >
                              <MenuItem value="PROMOTE">Promote</MenuItem>
                              <MenuItem value="REPEAT">Repeat Grade</MenuItem>
                              <MenuItem value="LEFT">Left School</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {dec.action !== 'LEFT' && (
                              <Select
                                size="small"
                                value={dec.target_section_id || ''}
                                onChange={(e) =>
                                  setDecisions({
                                    ...decisions,
                                    [st.student_id]: { ...dec, target_section_id: e.target.value },
                                  })
                                }
                                sx={{ minWidth: 140 }}
                              >
                                {previewMutation.data.target_sections.map((sec) => (
                                  <MenuItem key={sec.section_id} value={sec.section_id}>
                                    Section {sec.section_name} ({sec.available_seats ?? '—'} seats)
                                  </MenuItem>
                                ))}
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setActiveStep(0)} sx={{ textTransform: 'none' }}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleExecute}
                  disabled={executeMutation.isPending}
                  sx={{ textTransform: 'none', fontWeight: 600, minWidth: 140, borderRadius: 2 }}
                >
                  {executeMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Confirm Promotions'}
                </Button>
              </Box>
            </Paper>
          )}

          {/* Step 2: Summary */}
          {activeStep === 2 && executeMutation.data && (
            <Paper elevation={0} variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
              <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 64, mb: 2 }} />
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                Academic Promotions Completed Successfully!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {executeMutation.data.message}
              </Typography>

              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
                <Chip label={`Promoted: ${executeMutation.data.promoted_count}`} color="success" sx={{ fontWeight: 600 }} />
                <Chip label={`Repeating: ${executeMutation.data.repeated_count}`} color="warning" sx={{ fontWeight: 600 }} />
                <Chip label={`Left School: ${executeMutation.data.left_count}`} color="default" sx={{ fontWeight: 600 }} />
              </Stack>

              <Button
                variant="contained"
                onClick={() => router.push('/enrollments')}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
              >
                Return to Academic Enrollments
              </Button>
            </Paper>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
