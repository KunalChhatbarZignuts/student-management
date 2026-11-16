'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import SchoolIcon from '@mui/icons-material/School';
import Link from 'next/link';
import { apiClient } from '@/lib/axios';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import {
  RolloverExecutionResponse,
  RolloverPreviewResponse,
  rolloverApi,
} from '@/features/enrollments/api/rolloverApi';

interface AcademicYearOption {
  id: string;
  name: string;
  is_current?: boolean;
}

export default function AcademicYearRolloverPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [sourceYearId, setSourceYearId] = useState('');
  const [targetYearId, setTargetYearId] = useState('');

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<RolloverPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [autoAssignFees, setAutoAssignFees] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<RolloverExecutionResponse | null>(null);

  // Cached academic years
  const { data: academicYears = [] } = useQuery<AcademicYearOption[]>({
    queryKey: ['admin', 'academic-years', 'list'],
    queryFn: async () => {
      const res = await apiClient.get<AcademicYearOption[]>('/admin/academic-years');
      return res.data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (academicYears.length > 0 && !sourceYearId) {
      const cur = academicYears.find((y) => y.is_current);
      if (cur) {
        setSourceYearId(cur.id);
        const next = academicYears.find((y) => y.id !== cur.id);
        if (next) setTargetYearId(next.id);
      } else if (academicYears.length >= 2) {
        setSourceYearId(academicYears[1].id);
        setTargetYearId(academicYears[0].id);
      }
    }
  }, [academicYears, sourceYearId]);

  const handleFetchPreview = async () => {
    if (!sourceYearId || !targetYearId || sourceYearId === targetYearId) return;
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const data = await rolloverApi.getPreview(sourceYearId, targetYearId);
      setPreviewData(data);
      setActiveStep(1);
    } catch (err: any) {
      setPreviewError(err?.response?.data?.detail || 'Failed to load rollover preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecuteRollover = async () => {
    if (!previewData) return;
    setExecuting(true);
    setPreviewError(null);
    try {
      const gradeMappings = previewData.cohort_mappings.map((m) => ({
        source_grade_id: m.source_grade_id,
        target_grade_id: m.target_grade_id || undefined,
      }));

      const res = await rolloverApi.executeRollover({
        source_year_id: sourceYearId,
        target_year_id: targetYearId,
        grade_mappings: gradeMappings,
        auto_assign_base_fees: autoAssignFees,
      });

      setExecutionResult(res);
      setActiveStep(2);
    } catch (err: any) {
      setPreviewError(err?.response?.data?.detail || 'Failed to execute academic year rollover');
    } finally {
      setExecuting(false);
    }
  };

  const steps = ['Select Academic Years', 'Cohort Progression Review', 'Rollover Summary'];

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Annual Student Promotion & Academic Year Rollover
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Transition active cohorts to the upcoming academic year, configure grade mappings, and automatically initialize target base fee structures.
          </Typography>
        </Box>

        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {previewError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {previewError}
          </Alert>
        )}

        {/* STEP 0: Select Years */}
        {activeStep === 0 && (
          <Card sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Select Source & Target Academic Years
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Active students currently enrolled in the Source Year will be evaluated for progression into the Target Year.
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Source Academic Year (Current / Outgoing)"
                    value={sourceYearId}
                    onChange={(e) => setSourceYearId(e.target.value)}
                    fullWidth
                  >
                    {academicYears.map((y) => (
                      <MenuItem key={y.id} value={y.id}>
                        {y.name} {y.is_current ? '(Current Active)' : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Target Academic Year (Upcoming / Promoted To)"
                    value={targetYearId}
                    onChange={(e) => setTargetYearId(e.target.value)}
                    fullWidth
                  >
                    {academicYears
                      .filter((y) => y.id !== sourceYearId)
                      .map((y) => (
                        <MenuItem key={y.id} value={y.id}>
                          {y.name}
                        </MenuItem>
                      ))}
                  </TextField>
                </Grid>
              </Grid>

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleFetchPreview}
                  disabled={loadingPreview || !sourceYearId || !targetYearId}
                  endIcon={loadingPreview ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
                  sx={{ px: 4, py: 1.2, fontWeight: 700 }}
                >
                  {loadingPreview ? 'Analyzing Cohorts...' : 'Review Cohort Progression'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* STEP 1: Review Cohort Progression */}
        {activeStep === 1 && previewData && (
          <Box>
            {/* KPI summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: 'primary.50', border: '1px solid #bfdbfe' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="primary.main" fontWeight={600}>
                      TOTAL ACTIVE STUDENTS
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {previewData.total_active_students}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: 'grey.50', border: '1px solid #e2e8f0' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      SOURCE YEAR
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {previewData.source_year_name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: 'success.50', border: '1px solid #bbf7d0' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="success.dark" fontWeight={600}>
                      TARGET YEAR
                    </Typography>
                    <Typography variant="h5" color="success.main" fontWeight={700}>
                      {previewData.target_year_name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Warnings Alert */}
            {previewData.warnings.length > 0 && (
              <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Configuration Notice:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {previewData.warnings.map((w, idx) => (
                    <li key={idx}>
                      <Typography variant="caption">{w}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Cohort Progression Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'grey.100' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Source Grade ({previewData.source_year_name})</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Enrolled Students</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Target Progression ({previewData.target_year_name})</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Target Sections Available</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Fee Structure Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.cohort_mappings.map((m) => (
                    <TableRow key={m.source_grade_id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{m.source_grade_name}</TableCell>
                      <TableCell>
                        <Chip size="small" label={`${m.student_count} Students`} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ArrowForwardIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight={600} color={m.target_grade_id ? 'primary.main' : 'text.secondary'}>
                            {m.target_grade_name || 'Graduating Cohort'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {m.target_sections_available > 0 ? (
                          <Chip size="small" color="success" label={`${m.target_sections_available} Active Sections`} />
                        ) : (
                          <Chip size="small" color="error" label="0 Sections" />
                        )}
                      </TableCell>
                      <TableCell>
                        {m.fee_structure_configured ? (
                          <Chip
                            size="small"
                            color="success"
                            label="Configured"
                            icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                          />
                        ) : (
                          <Chip size="small" color="warning" label="Not Configured" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Auto Fee Assignment Checkbox */}
            <Card sx={{ mb: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={autoAssignFees}
                      onChange={(e) => setAutoAssignFees(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        Automatically initialize Base Fee Structures for the new academic year
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Promoted cohorts will instantly receive their target grade's annual fee assignment and ledger installments.
                      </Typography>
                    </Box>
                  }
                />
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => setActiveStep(0)}
                disabled={executing}
              >
                Back to Selection
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleExecuteRollover}
                disabled={executing}
                startIcon={executing ? <CircularProgress size={20} color="inherit" /> : <PublishedWithChangesIcon />}
                sx={{ px: 4, py: 1.2, fontWeight: 700 }}
              >
                {executing ? 'Executing Rollover...' : 'Confirm & Execute Rollover'}
              </Button>
            </Box>
          </Box>
        )}

        {/* STEP 2: Execution Result */}
        {activeStep === 2 && executionResult && (
          <Card sx={{ borderRadius: 2, textAlign: 'center', p: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Academic Year Rollover Completed!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              All student cohorts have been systematically processed and transitioned. Historical enrollment records have been preserved intact.
            </Typography>

            <Grid container spacing={3} sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <Typography variant="caption" color="success.dark" fontWeight={600}>
                    PROMOTED
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {executionResult.promoted_count}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, bgcolor: '#fef3c7', border: '1px solid #fde68a' }}>
                  <Typography variant="caption" color="warning.dark" fontWeight={600}>
                    REPEATERS
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.dark">
                    {executionResult.repeated_count}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <Typography variant="caption" color="primary.main" fontWeight={600}>
                    GRADUATED / LEFT
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {executionResult.graduated_left_count}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, bgcolor: '#faf5ff', border: '1px solid #e9d5ff' }}>
                  <Typography variant="caption" color="secondary.main" fontWeight={600}>
                    FEE ASSIGNMENTS
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="secondary.main">
                    {executionResult.fee_assignments_created_count}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                component={Link}
                href="/enrollments"
                variant="contained"
                size="large"
                startIcon={<SchoolIcon />}
              >
                Go to Academic Enrollments Dashboard
              </Button>
              <Button
                component={Link}
                href="/fees/pos"
                variant="outlined"
                size="large"
              >
                Open Fee Counter POS
              </Button>
            </Box>
          </Card>
        )}
      </Box>
    </RequireRole>
  );
}
