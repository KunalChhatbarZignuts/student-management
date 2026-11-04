'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';

import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentIcon from '@mui/icons-material/Payment';
import ReplayIcon from '@mui/icons-material/Replay';
import PrintIcon from '@mui/icons-material/Print';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';
import { ROLES } from '@/lib/constants';
import { adminGradeApi } from '@/features/grades/api';
import {
  adminFeeApi,
  FeeComponent,
  FeeComponentCreatePayload,
  FeeStructure,
  FeeStructureCreatePayload,
  StudentFeeAssignment,
  FeeInstallmentItem,
  PaymentTransaction,
  PaymentWebhookEvent,
  FeeReceipt,
  RecordOfflinePaymentPayload,
  StudentFeeAdjustmentPayload,
} from '@/features/fees/api';

export default function FeesManagementPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const [tabIndex, setTabIndex] = React.useState(0);

  // Filters
  const [selectedYearId, setSelectedYearId] = React.useState<string>('');
  const [selectedGradeId, setSelectedGradeId] = React.useState<string>('');
  const [assignmentSearch, setAssignmentSearch] = React.useState('');

  // Dialogs
  const [openComponentDialog, setOpenComponentDialog] = React.useState(false);
  const [editingComponent, setEditingComponent] = React.useState<FeeComponent | null>(null);

  const [openStructureDialog, setOpenStructureDialog] = React.useState(false);

  // Drawer for Student Assignment details
  const [viewingAssignmentId, setViewingAssignmentId] = React.useState<string | null>(null);

  // Additional Filters for Tab 3 & Tab 4
  const [txStatusFilter, setTxStatusFilter] = React.useState<string>('');
  const [txMethodFilter, setTxMethodFilter] = React.useState<string>('');
  const [webhookStatusFilter, setWebhookStatusFilter] = React.useState<string>('');

  // Offline Payment Modal State
  const [openOfflineDialog, setOpenOfflineDialog] = React.useState(false);
  const [payingInstallment, setPayingInstallment] = React.useState<FeeInstallmentItem | null>(null);
  const [offlineAmount, setOfflineAmount] = React.useState<number>(0);
  const [offlineMethod, setOfflineMethod] = React.useState<string>('cash');
  const [offlineDate, setOfflineDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [offlineNote, setOfflineNote] = React.useState<string>('');

  // Adjustment Modal State
  const [openAdjustmentDialog, setOpenAdjustmentDialog] = React.useState(false);
  const [adjPayload, setAdjPayload] = React.useState<StudentFeeAdjustmentPayload>({
    adjustment_type: 'merit_scholarship',
    category: 'concession',
    description: '',
    calculation_type: 'fixed',
    rate: null,
    amount: 0,
  });

  // Receipt Modal State
  const [openReceiptDialog, setOpenReceiptDialog] = React.useState(false);
  const [viewingReceiptNumber, setViewingReceiptNumber] = React.useState<string | null>(null);

  // Webhook Payload Modal
  const [viewingWebhook, setViewingWebhook] = React.useState<PaymentWebhookEvent | null>(null);

  // Fetch Academic Years
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: adminGradeApi.listAcademicYears,
  });

  // Auto-select current academic year
  React.useEffect(() => {
    if (academicYears.length > 0 && !selectedYearId) {
      const cur = academicYears.find((y) => y.is_current) || academicYears[0];
      setSelectedYearId(cur.id);
    }
  }, [academicYears, selectedYearId]);

  // Fetch Grades for selected year
  const { data: gradesData } = useQuery({
    queryKey: ['grades', { academic_year_id: selectedYearId }],
    queryFn: () => adminGradeApi.listGrades({ academic_year_id: selectedYearId || undefined, size: 100 }),
    enabled: Boolean(selectedYearId),
  });
  const grades = gradesData?.items || [];

  // Fetch Dashboard Metrics
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['fees', 'dashboard'],
    queryFn: adminFeeApi.getDashboardMetrics,
  });

  // Fetch Components
  const { data: components = [], isLoading: loadingComponents } = useQuery({
    queryKey: ['fees', 'components'],
    queryFn: () => adminFeeApi.listComponents(),
  });

  // Fetch Structures
  const { data: structures = [], isLoading: loadingStructures } = useQuery({
    queryKey: ['fees', 'structures', { academic_year_id: selectedYearId, grade_id: selectedGradeId }],
    queryFn: () =>
      adminFeeApi.listStructures({
        academic_year_id: selectedYearId || undefined,
        grade_id: selectedGradeId || undefined,
      }),
  });

  // Fetch Student Assignments
  const { data: assignmentsData, isLoading: loadingAssignments } = useQuery({
    queryKey: ['fees', 'assignments', { academic_year_id: selectedYearId, grade_id: selectedGradeId, search: assignmentSearch }],
    queryFn: () =>
      adminFeeApi.listAssignments({
        academic_year_id: selectedYearId || undefined,
        grade_id: selectedGradeId || undefined,
        search: assignmentSearch.trim() || undefined,
        limit: 50,
      }),
  });

  // Fetch Assignment Detail for Drawer
  const { data: assignmentDetail, isLoading: loadingAssignmentDetail } = useQuery({
    queryKey: ['fees', 'assignment-detail', viewingAssignmentId],
    queryFn: () => adminFeeApi.getAssignmentDetail(viewingAssignmentId!),
    enabled: Boolean(viewingAssignmentId),
  });

  // Fetch Payment Transactions (Tab 3)
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ['fees', 'transactions', { academic_year_id: selectedYearId, grade_id: selectedGradeId, status: txStatusFilter, payment_method: txMethodFilter }],
    queryFn: () =>
      adminFeeApi.listTransactions({
        academic_year_id: selectedYearId || undefined,
        grade_id: selectedGradeId || undefined,
        status: txStatusFilter || undefined,
        payment_method: txMethodFilter || undefined,
        limit: 50,
      }),
    enabled: tabIndex === 3,
  });

  // Fetch Webhook Events (Tab 4)
  const { data: webhooksData, isLoading: loadingWebhooks } = useQuery({
    queryKey: ['fees', 'webhooks', { status: webhookStatusFilter }],
    queryFn: () =>
      adminFeeApi.listWebhooks({
        status: webhookStatusFilter || undefined,
        limit: 50,
      }),
    enabled: tabIndex === 4,
  });

  // Fetch Receipt Detail
  const { data: receiptDetail, isLoading: loadingReceipt } = useQuery({
    queryKey: ['fees', 'receipt', viewingReceiptNumber],
    queryFn: () => adminFeeApi.getReceiptDetail(viewingReceiptNumber!),
    enabled: Boolean(viewingReceiptNumber),
  });

  // --- Component Form State ---
  const [compForm, setCompForm] = React.useState<FeeComponentCreatePayload>({
    name: '',
    code: '',
    description: '',
    fee_type: 'tuition',
    payment_frequency: 'annual',
    is_mandatory: true,
    is_recurring: false,
    status: 'active',
  });

  const handleOpenComponentModal = (comp?: FeeComponent) => {
    if (comp) {
      setEditingComponent(comp);
      setCompForm({
        name: comp.name,
        code: comp.code,
        description: comp.description || '',
        fee_type: comp.fee_type,
        payment_frequency: comp.payment_frequency,
        is_mandatory: comp.is_mandatory,
        is_recurring: comp.is_recurring,
        status: comp.status,
      });
    } else {
      setEditingComponent(null);
      setCompForm({
        name: '',
        code: '',
        description: '',
        fee_type: 'tuition',
        payment_frequency: 'annual',
        is_mandatory: true,
        is_recurring: false,
        status: 'active',
      });
    }
    setOpenComponentDialog(true);
  };

  const saveComponentMutation = useMutation({
    mutationFn: (payload: FeeComponentCreatePayload) => {
      if (editingComponent) {
        return adminFeeApi.updateComponent(editingComponent.id, payload);
      }
      return adminFeeApi.createComponent(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', 'components'] });
      showSnackbar(
        editingComponent ? 'Component updated successfully' : 'Component created successfully',
        'success'
      );
      setOpenComponentDialog(false);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to save component'), 'error'),
  });

  const toggleComponentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      adminFeeApi.toggleComponentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', 'components'] });
      showSnackbar('Status updated', 'success');
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to update status'), 'error'),
  });

  // --- Structure Form State ---
  const [structForm, setStructForm] = React.useState<{
    name: string;
    academicYearId: string;
    gradeId: string;
    effectiveDate: string;
    items: { feeComponentId: string; amount: number; paymentFrequency: string; isMandatory: boolean }[];
  }>({
    name: '',
    academicYearId: '',
    gradeId: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    items: [],
  });

  const handleOpenStructureModal = () => {
    const activeComps = components.filter((c) => c.status === 'active');
    setStructForm({
      name: '',
      academicYearId: selectedYearId || (academicYears[0]?.id ?? ''),
      gradeId: selectedGradeId || (grades[0]?.id ?? ''),
      effectiveDate: new Date().toISOString().split('T')[0],
      items: activeComps.map((c) => ({
        feeComponentId: c.id,
        amount: c.is_mandatory ? 10000 : 2000,
        paymentFrequency: c.payment_frequency,
        isMandatory: c.is_mandatory,
      })),
    });
    setOpenStructureDialog(true);
  };

  const createStructureMutation = useMutation({
    mutationFn: (payload: FeeStructureCreatePayload) => adminFeeApi.createStructure(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', 'structures'] });
      queryClient.invalidateQueries({ queryKey: ['fees', 'dashboard'] });
      showSnackbar('Fee structure created successfully', 'success');
      setOpenStructureDialog(false);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to create fee structure'), 'error'),
  });

  const recordOfflinePaymentMutation = useMutation({
    mutationFn: ({ installmentId, payload }: { installmentId: string; payload: RecordOfflinePaymentPayload }) =>
      adminFeeApi.recordOfflinePayment(installmentId, payload),
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      showSnackbar(`Offline payment recorded. Receipt: ${receipt.receipt_number}`, 'success');
      setOpenOfflineDialog(false);
      setViewingReceiptNumber(receipt.receipt_number);
      setOpenReceiptDialog(true);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to record offline payment'), 'error'),
  });

  const applyAdjustmentMutation = useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: string; payload: StudentFeeAdjustmentPayload }) =>
      adminFeeApi.applyAdjustment(assignmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      showSnackbar('Fee adjustment applied and schedule recalculated', 'success');
      setOpenAdjustmentDialog(false);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to apply adjustment'), 'error'),
  });

  const retryWebhookMutation = useMutation({
    mutationFn: (eventId: string) => adminFeeApi.retryWebhook(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees', 'webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['fees', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['fees', 'dashboard'] });
      showSnackbar('Webhook event reprocessed successfully', 'success');
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Webhook retry failed'), 'error'),
  });

  const handleSaveStructure = () => {
    if (!structForm.name.trim()) {
      showSnackbar('Structure name is required', 'error');
      return;
    }
    if (!structForm.academicYearId || !structForm.gradeId) {
      showSnackbar('Academic Year and Grade must be selected', 'error');
      return;
    }
    const payload: FeeStructureCreatePayload = {
      academic_year_id: structForm.academicYearId,
      grade_id: structForm.gradeId,
      name: structForm.name.trim(),
      effective_date: structForm.effectiveDate,
      status: 'active',
      items: structForm.items.map((i, idx) => ({
        fee_component_id: i.feeComponentId,
        amount: Number(i.amount) || 0,
        payment_frequency: i.paymentFrequency,
        is_mandatory: i.isMandatory,
        display_order: idx,
      })),
    };
    createStructureMutation.mutate(payload);
  };

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Fee Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Configure grade-level fee schedules, manage fee components, and track student fee assignments.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Dashboard KPI Summary Cards */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'primary.main' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  TOTAL ASSIGNED FEES
                </Typography>
                {loadingMetrics ? (
                  <CircularProgress size={24} sx={{ my: 1 }} />
                ) : (
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    ₹{Number(metrics?.total_assigned_fees ?? 0).toLocaleString()}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Across {metrics?.total_student_assignments ?? 0} active student enrollments
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'warning.main' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  OUTSTANDING BALANCE
                </Typography>
                {loadingMetrics ? (
                  <CircularProgress size={24} sx={{ my: 1 }} />
                ) : (
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    ₹{Number(metrics?.total_outstanding_fees ?? 0).toLocaleString()}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Remaining across pending installments
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'success.main' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  COLLECTED FEES
                </Typography>
                {loadingMetrics ? (
                  <CircularProgress size={24} sx={{ my: 1 }} />
                ) : (
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    ₹{Number(metrics?.total_collected_fees ?? 0).toLocaleString()}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Settled fee installment receipts
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', borderLeft: 4, borderColor: 'info.main' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  ACTIVE STRUCTURES
                </Typography>
                {loadingMetrics ? (
                  <CircularProgress size={24} sx={{ my: 1 }} />
                ) : (
                  <Typography variant="h4" fontWeight={700} color="info.main">
                    {metrics?.total_active_structures ?? 0}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Grade fee plans in active session
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Navigation Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} indicatorColor="primary" textColor="primary">
            <Tab label="Student Fee Assignments" />
            <Tab label="Grade Fee Structures" />
            <Tab label="Fee Components Catalog" />
          </Tabs>
        </Paper>

        {/* Tab 0: Student Fee Assignments */}
        {tabIndex === 0 && (
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search student name or enrollment..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: '100%', sm: 300 } }}
              />

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Academic Year</InputLabel>
                <Select
                  label="Academic Year"
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                >
                  <MenuItem value="">All Academic Years</MenuItem>
                  {academicYears.map((ay) => (
                    <MenuItem key={ay.id} value={ay.id}>
                      {ay.name} {ay.is_current ? ' (Current)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Grade</InputLabel>
                <Select
                  label="Grade"
                  value={selectedGradeId}
                  onChange={(e) => setSelectedGradeId(e.target.value)}
                >
                  <MenuItem value="">All Grades</MenuItem>
                  {grades.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Enrollment No</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Base Fee</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Discounts</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Charges</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Final Payable</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Installments</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingAssignments ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : assignmentsData?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No student fee assignments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignmentsData?.items.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{row.student_name}</TableCell>
                        <TableCell>
                          <code>{row.enrollment_number || row.student_code}</code>
                        </TableCell>
                        <TableCell>{row.grade_name}</TableCell>
                        <TableCell align="right">₹{Number(row.base_amount).toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          -₹{Number(row.total_discount).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          +₹{Number(row.total_additional).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          ₹{Number(row.final_payable_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip label={`${row.installments_count} parts`} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Fee Breakdown & Schedule">
                            <IconButton size="small" color="primary" onClick={() => setViewingAssignmentId(row.id)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* Tab 1: Grade Fee Structures */}
        {tabIndex === 1 && (
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Academic Year</InputLabel>
                  <Select
                    label="Academic Year"
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                  >
                    {academicYears.map((ay) => (
                      <MenuItem key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_current ? ' (Current)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenStructureModal}>
                Configure Grade Fee Structure
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Structure Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Academic Year</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Base Amount (Mandatory)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Components</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Effective Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingStructures ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : structures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No fee structures configured for this session. Click "Configure Grade Fee Structure" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    structures.map((s) => (
                      <TableRow key={s.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                        <TableCell>{s.grade_name || 'N/A'}</TableCell>
                        <TableCell>{s.academic_year_name || 'N/A'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          ₹{Number(s.total_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{s.items_count} components</TableCell>
                        <TableCell>{s.effective_date}</TableCell>
                        <TableCell>
                          <Chip
                            label={s.status}
                            size="small"
                            color={s.status === 'active' ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* Tab 2: Fee Components Catalog */}
        {tabIndex === 2 && (
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>
                Fee Components Catalog
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenComponentModal()}>
                Add Fee Component
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Component Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Frequency</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nature</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingComponents ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : components.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No fee components found. Click "Add Fee Component" to define one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    components.map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                        <TableCell>
                          <code>{c.code}</code>
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{c.fee_type}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{c.payment_frequency}</TableCell>
                        <TableCell>
                          {c.is_mandatory ? (
                            <Chip label="Mandatory" size="small" color="primary" variant="outlined" />
                          ) : (
                            <Chip label="Optional" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={c.status}
                            size="small"
                            color={c.status === 'active' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit Component">
                            <IconButton size="small" onClick={() => handleOpenComponentModal(c)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={c.status === 'active' ? 'Deactivate' : 'Activate'}>
                            <IconButton
                              size="small"
                              color={c.status === 'active' ? 'error' : 'success'}
                              onClick={() =>
                                toggleComponentMutation.mutate({
                                  id: c.id,
                                  status: c.status === 'active' ? 'inactive' : 'active',
                                })
                              }
                            >
                              <Switch size="small" checked={c.status === 'active'} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* Tab 3: Payment Transactions */}
        {tabIndex === 3 && (
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="captured">Captured / Success</MenuItem>
                  <MenuItem value="authorized">Authorized</MenuItem>
                  <MenuItem value="created">Created (Pending)</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="refunded">Refunded</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Method / Channel</InputLabel>
                <Select
                  label="Method / Channel"
                  value={txMethodFilter}
                  onChange={(e) => setTxMethodFilter(e.target.value)}
                >
                  <MenuItem value="">All Methods</MenuItem>
                  <MenuItem value="online">Online (Razorpay)</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="demand_draft">Demand Draft</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Transactions: <b>{transactionsData?.total ?? 0}</b>
                </Typography>
              </Box>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Installment</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Provider / Channel</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Order ID / Ref</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Amount (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Receipt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingTransactions ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : !transactionsData?.items || transactionsData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No payment transactions recorded for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactionsData.items.map((tx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {tx.student_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tx.student_code || tx.grade_name || 'Student'}
                          </Typography>
                        </TableCell>
                        <TableCell>{tx.installment_name || 'Installment'}</TableCell>
                        <TableCell sx={{ textTransform: 'uppercase' }}>
                          <Chip
                            label={tx.gateway_provider}
                            size="small"
                            variant="outlined"
                            color={tx.gateway_provider === 'razorpay' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {tx.gateway_payment_id || tx.gateway_order_id}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          ₹{Number(tx.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tx.status}
                            size="small"
                            color={
                              tx.status === 'captured'
                                ? 'success'
                                : tx.status === 'failed'
                                ? 'error'
                                : tx.status === 'authorized'
                                ? 'info'
                                : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="center">
                          {tx.receipt_number ? (
                            <Tooltip title={`View Receipt: ${tx.receipt_number}`}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ReceiptIcon fontSize="small" />}
                                onClick={() => {
                                  setViewingReceiptNumber(tx.receipt_number!);
                                  setOpenReceiptDialog(true);
                                }}
                              >
                                {tx.receipt_number}
                              </Button>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* Tab 4: Webhook Monitoring */}
        {tabIndex === 4 && (
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={webhookStatusFilter}
                  onChange={(e) => setWebhookStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="processed">Processed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="received">Received / Pending</MenuItem>
                  <MenuItem value="ignored">Ignored</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Webhook Events: <b>{webhooksData?.total ?? 0}</b>
                </Typography>
              </Box>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Event ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Event Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Provider</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Retries</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Error / Notes</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingWebhooks ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : !webhooksData?.items || webhooksData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No webhook events recorded matching criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    webhooksData.items.map((ev) => (
                      <TableRow key={ev.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(ev.created_at).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {ev.event_id}
                        </TableCell>
                        <TableCell>
                          <Chip label={ev.event_type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ textTransform: 'uppercase' }}>{ev.gateway_provider}</TableCell>
                        <TableCell>
                          <Chip
                            label={ev.processing_status}
                            size="small"
                            color={
                              ev.processing_status === 'processed'
                                ? 'success'
                                : ev.processing_status === 'failed'
                                ? 'error'
                                : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{ev.retry_count ?? 0}</TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            color={ev.failure_reason ? 'error.main' : 'text.secondary'}
                            sx={{ maxWidth: 220, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {ev.failure_reason || 'OK'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Payload">
                            <IconButton size="small" onClick={() => setViewingWebhook(ev)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {ev.processing_status === 'failed' && (
                            <Tooltip title="Retry Processing Webhook">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => retryWebhookMutation.mutate(ev.event_id)}
                                disabled={retryWebhookMutation.isPending}
                              >
                                <ReplayIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* Dialog: Create/Edit Fee Component */}
        <Dialog open={openComponentDialog} onClose={() => setOpenComponentDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingComponent ? 'Edit Fee Component' : 'Add Fee Component'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Component Name"
                  required
                  fullWidth
                  placeholder="e.g. Tuition Fee"
                  value={compForm.name}
                  onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Component Code"
                  required
                  fullWidth
                  placeholder="e.g. TUITION"
                  disabled={Boolean(editingComponent)}
                  value={compForm.code}
                  onChange={(e) => setCompForm({ ...compForm, code: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Fee Type</InputLabel>
                  <Select
                    label="Fee Type"
                    value={compForm.fee_type}
                    onChange={(e) => setCompForm({ ...compForm, fee_type: e.target.value })}
                  >
                    <MenuItem value="tuition">Tuition</MenuItem>
                    <MenuItem value="admission">Admission</MenuItem>
                    <MenuItem value="transport">Transport</MenuItem>
                    <MenuItem value="activity">Activity</MenuItem>
                    <MenuItem value="exam">Examination</MenuItem>
                    <MenuItem value="other">Other / Custom</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Frequency</InputLabel>
                  <Select
                    label="Payment Frequency"
                    value={compForm.payment_frequency}
                    onChange={(e) => setCompForm({ ...compForm, payment_frequency: e.target.value })}
                  >
                    <MenuItem value="one_time">One-time</MenuItem>
                    <MenuItem value="annual">Annually</MenuItem>
                    <MenuItem value="half_yearly">Half-Yearly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={compForm.description}
                  onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={compForm.is_mandatory}
                      onChange={(e) => setCompForm({ ...compForm, is_mandatory: e.target.checked })}
                    />
                  }
                  label="Mandatory Component"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={compForm.is_recurring}
                      onChange={(e) => setCompForm({ ...compForm, is_recurring: e.target.checked })}
                    />
                  }
                  label="Recurring Charge"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenComponentDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => saveComponentMutation.mutate(compForm)}
              disabled={saveComponentMutation.isPending}
            >
              {saveComponentMutation.isPending ? 'Saving...' : 'Save Component'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: Configure Grade Fee Structure */}
        <Dialog open={openStructureDialog} onClose={() => setOpenStructureDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Configure Grade Fee Structure</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Structure Name"
                  required
                  fullWidth
                  placeholder="e.g. Grade 2 Standard Fee Plan 2026-27"
                  value={structForm.name}
                  onChange={(e) => setStructForm({ ...structForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth required>
                  <InputLabel>Academic Year</InputLabel>
                  <Select
                    label="Academic Year"
                    value={structForm.academicYearId}
                    onChange={(e) => setStructForm({ ...structForm, academicYearId: e.target.value })}
                  >
                    {academicYears.map((ay) => (
                      <MenuItem key={ay.id} value={ay.id}>
                        {ay.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth required>
                  <InputLabel>Grade</InputLabel>
                  <Select
                    label="Grade"
                    value={structForm.gradeId}
                    onChange={(e) => setStructForm({ ...structForm, gradeId: e.target.value })}
                  >
                    {grades.map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Itemized Fee Components & Amounts
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell>Component</TableCell>
                        <TableCell>Amount (₹)</TableCell>
                        <TableCell>Frequency</TableCell>
                        <TableCell>Mandatory?</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {structForm.items.map((item, index) => {
                        const comp = components.find((c) => c.id === item.feeComponentId);
                        return (
                          <TableRow key={item.feeComponentId}>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {comp?.name || 'Component'} ({comp?.code})
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={item.amount}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const updated = [...structForm.items];
                                  updated[index].amount = val;
                                  setStructForm({ ...structForm, items: updated });
                                }}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                }}
                                sx={{ width: 140 }}
                              />
                            </TableCell>
                            <TableCell sx={{ textTransform: 'capitalize' }}>{item.paymentFrequency}</TableCell>
                            <TableCell>
                              <FormControlLabel
                                control={
                                  <Switch
                                    size="small"
                                    checked={item.isMandatory}
                                    onChange={(e) => {
                                      const updated = [...structForm.items];
                                      updated[index].isMandatory = e.target.checked;
                                      setStructForm({ ...structForm, items: updated });
                                    }}
                                  />
                                }
                                label={item.isMandatory ? 'Mandatory' : 'Optional'}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenStructureDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveStructure}
              disabled={createStructureMutation.isPending}
            >
              {createStructureMutation.isPending ? 'Saving...' : 'Save Fee Structure'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Drawer: Detailed Student Fee Assignment */}
        <Drawer
          anchor="right"
          open={Boolean(viewingAssignmentId)}
          onClose={() => setViewingAssignmentId(null)}
          PaperProps={{ sx: { width: { xs: '100%', sm: 550 }, p: 3 } }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Student Fee Assignment Detail
            </Typography>
            <IconButton onClick={() => setViewingAssignmentId(null)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {loadingAssignmentDetail || !assignmentDetail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {assignmentDetail.student_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enrollment: <code>{assignmentDetail.enrollment_number || assignmentDetail.student_code}</code>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Grade: {assignmentDetail.grade_name} • Academic Year: {assignmentDetail.academic_year_name}
                </Typography>
              </Paper>

              {/* Financial Summary */}
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Fee Summary
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Base Configured Fee:</Typography>
                  <Typography variant="body2" fontWeight={600}>₹{Number(assignmentDetail.base_amount).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'success.main' }}>
                  <Typography variant="body2">Total Discounts & Concessions:</Typography>
                  <Typography variant="body2" fontWeight={600}>-₹{Number(assignmentDetail.total_discount).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'error.main' }}>
                  <Typography variant="body2">Additional Charges:</Typography>
                  <Typography variant="body2" fontWeight={600}>+₹{Number(assignmentDetail.total_additional).toLocaleString()}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" fontWeight={700}>Final Payable Amount:</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                    ₹{Number(assignmentDetail.final_payable_amount).toLocaleString()}
                  </Typography>
                </Box>
              </Paper>

              {/* Adjustments List */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Individual Adjustments ({assignmentDetail.adjustments?.length || 0})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={() => {
                    setAdjPayload({
                      adjustment_type: 'merit_scholarship',
                      category: 'concession',
                      description: '',
                      calculation_type: 'fixed',
                      rate: null,
                      amount: 0,
                    });
                    setOpenAdjustmentDialog(true);
                  }}
                >
                  Add Concession / Charge
                </Button>
              </Box>

              {assignmentDetail.adjustments && assignmentDetail.adjustments.length > 0 ? (
                <Box sx={{ mb: 3 }}>
                  {assignmentDetail.adjustments.map((adj) => (
                    <Paper key={adj.id} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {adj.description}
                        </Typography>
                        <Chip
                          label={adj.category === 'additional_charge' ? `+₹${adj.amount}` : `-₹${adj.amount}`}
                          size="small"
                          color={adj.category === 'additional_charge' ? 'error' : 'success'}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Type: {adj.adjustment_type} {adj.rate ? `(${adj.rate}%)` : ''}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                  No individual concessions or additional charges applied.
                </Typography>
              )}

              {/* Installment Schedule */}
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Installment Schedule
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Installment</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Outstanding</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignmentDetail.installments.map((inst) => (
                      <TableRow key={inst.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{inst.installment_name}</TableCell>
                        <TableCell>{inst.due_date}</TableCell>
                        <TableCell align="right">₹{Number(inst.amount).toLocaleString()}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 600,
                            color: Number(inst.outstanding_amount) > 0 ? 'warning.main' : 'success.main',
                          }}
                        >
                          ₹{Number(inst.outstanding_amount ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={inst.status}
                            size="small"
                            color={inst.status === 'paid' ? 'success' : inst.status === 'pending' ? 'default' : 'warning'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {Number(inst.outstanding_amount) > 0 && (
                            <Tooltip title="Record Offline Payment (Cash, Cheque, Bank Transfer)">
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<PaymentIcon fontSize="small" />}
                                onClick={() => {
                                  setPayingInstallment(inst);
                                  setOfflineAmount(Number(inst.outstanding_amount));
                                  setOfflineMethod('cash');
                                  setOfflineDate(new Date().toISOString().split('T')[0]);
                                  setOfflineNote('');
                                  setOpenOfflineDialog(true);
                                }}
                                sx={{ py: 0.25, fontSize: '0.75rem' }}
                              >
                                Record Pay
                              </Button>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Drawer>

        {/* Dialog: Record Offline Payment */}
        <Dialog open={openOfflineDialog} onClose={() => setOpenOfflineDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Record Offline Payment</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Installment: <b>{payingInstallment?.installment_name}</b>
              </Typography>
              <Typography variant="body2" color="warning.main" fontWeight={600}>
                Outstanding Balance: ₹{Number(payingInstallment?.outstanding_amount ?? 0).toLocaleString()}
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Payment Amount (₹)"
                  type="number"
                  required
                  fullWidth
                  value={offlineAmount}
                  onChange={(e) => setOfflineAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  helperText={`Cannot exceed outstanding ₹${Number(payingInstallment?.outstanding_amount ?? 0).toLocaleString()}`}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Mode</InputLabel>
                  <Select
                    label="Payment Mode"
                    value={offlineMethod}
                    onChange={(e) => setOfflineMethod(e.target.value)}
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</MenuItem>
                    <MenuItem value="demand_draft">Demand Draft</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Payment Date"
                  type="date"
                  required
                  fullWidth
                  value={offlineDate}
                  onChange={(e) => setOfflineDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Reference / Cheque No / Remarks"
                  placeholder="e.g. Cheque #492810 HDFC or Cash counter ref"
                  fullWidth
                  multiline
                  rows={2}
                  value={offlineNote}
                  onChange={(e) => setOfflineNote(e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenOfflineDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                if (!payingInstallment) return;
                if (offlineAmount <= 0) {
                  showSnackbar('Amount must be greater than 0', 'error');
                  return;
                }
                if (offlineAmount > Number(payingInstallment.outstanding_amount)) {
                  showSnackbar('Amount cannot exceed outstanding balance', 'error');
                  return;
                }
                recordOfflinePaymentMutation.mutate({
                  installmentId: payingInstallment.id,
                  payload: {
                    amount: offlineAmount,
                    payment_method: offlineMethod,
                    payment_date: offlineDate,
                    reference_note: offlineNote || undefined,
                  },
                });
              }}
              disabled={recordOfflinePaymentMutation.isPending}
            >
              {recordOfflinePaymentMutation.isPending ? 'Recording...' : 'Confirm Payment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: Add Concession or Additional Charge */}
        <Dialog open={openAdjustmentDialog} onClose={() => setOpenAdjustmentDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Apply Concession or Fee Adjustment</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    label="Category"
                    value={adjPayload.category}
                    onChange={(e) =>
                      setAdjPayload({
                        ...adjPayload,
                        category: e.target.value as any,
                        adjustment_type:
                          e.target.value === 'additional_charge'
                            ? 'additional_charge'
                            : e.target.value === 'discount'
                            ? 'early_bird_discount'
                            : 'merit_scholarship',
                      })
                    }
                  >
                    <MenuItem value="concession">Concession / Scholarship</MenuItem>
                    <MenuItem value="discount">Discount</MenuItem>
                    <MenuItem value="additional_charge">Additional Charge</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Adjustment Identifier / Type"
                  fullWidth
                  required
                  value={adjPayload.adjustment_type}
                  onChange={(e) => setAdjPayload({ ...adjPayload, adjustment_type: e.target.value })}
                  placeholder="e.g. sibling_concession or merit_scholarship"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description / Reason"
                  fullWidth
                  required
                  placeholder="e.g. 10% Sibling Concession or Academic Excellence Grant"
                  value={adjPayload.description}
                  onChange={(e) => setAdjPayload({ ...adjPayload, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Calculation Type</InputLabel>
                  <Select
                    label="Calculation Type"
                    value={adjPayload.calculation_type}
                    onChange={(e) =>
                      setAdjPayload({
                        ...adjPayload,
                        calculation_type: e.target.value as any,
                        rate: e.target.value === 'percentage' ? 10 : null,
                      })
                    }
                  >
                    <MenuItem value="fixed">Fixed Amount (₹)</MenuItem>
                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {adjPayload.calculation_type === 'percentage' ? (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Percentage Rate (%)"
                    type="number"
                    required
                    fullWidth
                    value={adjPayload.rate ?? ''}
                    onChange={(e) =>
                      setAdjPayload({
                        ...adjPayload,
                        rate: parseFloat(e.target.value) || 0,
                        amount: 0,
                      })
                    }
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                  />
                </Grid>
              ) : (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Fixed Amount (₹)"
                    type="number"
                    required
                    fullWidth
                    value={adjPayload.amount}
                    onChange={(e) =>
                      setAdjPayload({
                        ...adjPayload,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  />
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAdjustmentDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                if (!viewingAssignmentId) return;
                if (!adjPayload.description.trim()) {
                  showSnackbar('Please enter a description', 'error');
                  return;
                }
                applyAdjustmentMutation.mutate({
                  assignmentId: viewingAssignmentId,
                  payload: adjPayload,
                });
              }}
              disabled={applyAdjustmentMutation.isPending}
            >
              {applyAdjustmentMutation.isPending ? 'Applying...' : 'Apply & Recalculate'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: Printable Fee Receipt Modal */}
        <Dialog open={openReceiptDialog} onClose={() => setOpenReceiptDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Official Fee Payment Receipt</span>
            <Box>
              <IconButton onClick={() => window.print()} title="Print Receipt">
                <PrintIcon />
              </IconButton>
              <IconButton onClick={() => setOpenReceiptDialog(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {loadingReceipt || !receiptDetail ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ p: 3, bgcolor: '#fafafa' }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h5" fontWeight={800} color="primary.main">
                    STUDENT MANAGEMENT ACADEMY
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Official Fee Payment Receipt & Acknowledgment
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 1 }}>
                    {receiptDetail.receipt_number}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Date: {receiptDetail.payment_date} • Channel: {receiptDetail.payment_method.toUpperCase()}
                  </Typography>
                </Box>

                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Student Name</Typography>
                    <Typography variant="body2" fontWeight={600}>{receiptDetail.student_name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Enrollment / Code</Typography>
                    <Typography variant="body2" fontWeight={600}>{receiptDetail.enrollment_number || receiptDetail.student_code || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Grade / Class</Typography>
                    <Typography variant="body2" fontWeight={600}>{receiptDetail.grade_name || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Academic Year</Typography>
                    <Typography variant="body2" fontWeight={600}>{receiptDetail.academic_year_name || '—'}</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Installment Description:</Typography>
                    <Typography variant="body2" fontWeight={600}>{receiptDetail.installment_name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Installment Total:</Typography>
                    <Typography variant="body2">₹{Number(receiptDetail.installment_total_amount).toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'success.main' }}>
                    <Typography variant="subtitle1" fontWeight={700}>Amount Paid Today:</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>₹{Number(receiptDetail.amount).toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                    <Typography variant="body2">Remaining Outstanding:</Typography>
                    <Typography variant="body2" fontWeight={600}>₹{Number(receiptDetail.installment_outstanding_amount).toLocaleString()}</Typography>
                  </Box>
                </Box>

                {receiptDetail.reference_note && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Note / Ref:</Typography>
                    <Typography variant="body2">{receiptDetail.reference_note}</Typography>
                  </Box>
                )}

                <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed #ccc', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Status: <b>{receiptDetail.status.toUpperCase()}</b> • This is a computer-generated receipt, valid without physical signature.
                  </Typography>
                </Box>
              </Paper>
            )}
          </DialogContent>
          <DialogActions>
            <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
              Print Receipt
            </Button>
            <Button onClick={() => setOpenReceiptDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: Webhook Payload Viewer */}
        <Dialog open={Boolean(viewingWebhook)} onClose={() => setViewingWebhook(null)} maxWidth="md" fullWidth>
          <DialogTitle>Webhook Event: {viewingWebhook?.event_id}</DialogTitle>
          <DialogContent dividers>
            {viewingWebhook && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Provider</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'uppercase' }}>
                      {viewingWebhook.gateway_provider}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Event Type</Typography>
                    <Typography variant="body2" fontWeight={600}>{viewingWebhook.event_type}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Processing Status</Typography>
                    <Chip
                      label={viewingWebhook.processing_status}
                      size="small"
                      color={viewingWebhook.processing_status === 'processed' ? 'success' : viewingWebhook.processing_status === 'failed' ? 'error' : 'default'}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Retries</Typography>
                    <Typography variant="body2" fontWeight={600}>{viewingWebhook.retry_count ?? 0}</Typography>
                  </Grid>
                </Grid>

                {viewingWebhook.failure_reason && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {viewingWebhook.failure_reason}
                  </Alert>
                )}

                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Raw Gateway Payload (JSON)
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: '#272822',
                    color: '#f8f8f2',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    maxHeight: 400,
                    overflow: 'auto',
                  }}
                >
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(viewingWebhook.raw_payload, null, 2)}
                  </pre>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {viewingWebhook?.processing_status === 'failed' && (
              <Button
                color="warning"
                startIcon={<ReplayIcon />}
                onClick={() => {
                  retryWebhookMutation.mutate(viewingWebhook.event_id);
                  setViewingWebhook(null);
                }}
                disabled={retryWebhookMutation.isPending}
              >
                Retry Processing
              </Button>
            )}
            <Button onClick={() => setViewingWebhook(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      </AppShell>
    </RequireRole>
  );
}
