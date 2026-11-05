'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/ui/PageHeader';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';
import { ROLES } from '@/lib/constants';
import { adminGradeApi } from '@/features/grades/api';
import {
  adminFeeApi,
  FeeComponent,
  FeeComponentCreatePayload,
  FeeStructureCreatePayload,
  FeeInstallmentItem,
  PaymentWebhookEvent,
  RecordOfflinePaymentPayload,
  StudentFeeAdjustmentPayload,
} from '@/features/fees/api';

import {
  FeesMetricCards,
  StudentFeesTab,
  FeeStructuresTab,
  FeeComponentsTab,
  PaymentTransactionsTab,
  PaymentWebhooksTab,
  FeeComponentDialog,
  FeeStructureDialog,
  StudentAssignmentDrawer,
  OfflinePaymentDialog,
  FeeAdjustmentDialog,
  FeeReceiptDialog,
  WebhookPayloadDialog,
} from '@/features/fees/components';

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
        <PageHeader
          title="Fee Management"
          subtitle="Configure grade-level fee schedules, manage fee components, and track student fee assignments."
        />

        {/* Dashboard KPI Summary Cards */}
        <FeesMetricCards metrics={metrics} isLoading={loadingMetrics} />

        {/* Navigation Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabIndex}
            onChange={(_, val) => setTabIndex(val)}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Student Fee Assignments" />
            <Tab label="Grade Fee Structures" />
            <Tab label="Fee Components Catalog" />
            <Tab label="Payment Transactions" />
            <Tab label="Webhook Monitoring" />
          </Tabs>
        </Paper>

        {/* Tab 0: Student Fee Assignments */}
        {tabIndex === 0 && (
          <StudentFeesTab
            assignmentSearch={assignmentSearch}
            onSearchChange={setAssignmentSearch}
            selectedYearId={selectedYearId}
            onYearChange={setSelectedYearId}
            academicYears={academicYears}
            selectedGradeId={selectedGradeId}
            onGradeChange={setSelectedGradeId}
            grades={grades}
            assignmentsData={assignmentsData}
            isLoading={loadingAssignments}
            onViewAssignment={setViewingAssignmentId}
          />
        )}

        {/* Tab 1: Grade Fee Structures */}
        {tabIndex === 1 && (
          <FeeStructuresTab
            selectedYearId={selectedYearId}
            onYearChange={setSelectedYearId}
            academicYears={academicYears}
            structures={structures}
            isLoading={loadingStructures}
            onOpenCreateStructure={handleOpenStructureModal}
          />
        )}

        {/* Tab 2: Fee Components Catalog */}
        {tabIndex === 2 && (
          <FeeComponentsTab
            components={components}
            isLoading={loadingComponents}
            onOpenCreateComponent={() => handleOpenComponentModal()}
            onOpenEditComponent={(comp) => handleOpenComponentModal(comp)}
            onToggleStatus={(id, currentStatus) =>
              toggleComponentMutation.mutate({
                id,
                status: currentStatus === 'active' ? 'inactive' : 'active',
              })
            }
          />
        )}

        {/* Tab 3: Payment Transactions */}
        {tabIndex === 3 && (
          <PaymentTransactionsTab
            txStatusFilter={txStatusFilter}
            onStatusFilterChange={setTxStatusFilter}
            txMethodFilter={txMethodFilter}
            onMethodFilterChange={setTxMethodFilter}
            transactionsData={transactionsData}
            isLoading={loadingTransactions}
            onViewReceipt={(receiptNum) => {
              setViewingReceiptNumber(receiptNum);
              setOpenReceiptDialog(true);
            }}
          />
        )}

        {/* Tab 4: Webhook Monitoring */}
        {tabIndex === 4 && (
          <PaymentWebhooksTab
            webhookStatusFilter={webhookStatusFilter}
            onStatusFilterChange={setWebhookStatusFilter}
            webhooksData={webhooksData}
            isLoading={loadingWebhooks}
            onViewWebhookPayload={setViewingWebhook}
            onRetryWebhook={(eventId) => retryWebhookMutation.mutate(eventId)}
            isRetrying={retryWebhookMutation.isPending}
          />
        )}

        {/* Dialog: Create/Edit Fee Component */}
        <FeeComponentDialog
          open={openComponentDialog}
          onClose={() => setOpenComponentDialog(false)}
          editingComponent={editingComponent}
          form={compForm}
          onChangeForm={setCompForm}
          onSubmit={() => saveComponentMutation.mutate(compForm)}
          isSubmitting={saveComponentMutation.isPending}
        />

        {/* Dialog: Configure Grade Fee Structure */}
        <FeeStructureDialog
          open={openStructureDialog}
          onClose={() => setOpenStructureDialog(false)}
          form={structForm}
          onChangeForm={setStructForm}
          academicYears={academicYears}
          grades={grades}
          components={components}
          onSubmit={handleSaveStructure}
          isSubmitting={createStructureMutation.isPending}
        />

        {/* Drawer: Detailed Student Fee Assignment */}
        <StudentAssignmentDrawer
          open={Boolean(viewingAssignmentId)}
          onClose={() => setViewingAssignmentId(null)}
          assignmentDetail={assignmentDetail}
          isLoading={loadingAssignmentDetail}
          onOpenAdjustmentDialog={() => {
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
          onOpenOfflinePaymentDialog={(inst) => {
            setPayingInstallment(inst);
            setOfflineAmount(Number(inst.outstanding_amount));
            setOfflineMethod('cash');
            setOfflineDate(new Date().toISOString().split('T')[0]);
            setOfflineNote('');
            setOpenOfflineDialog(true);
          }}
        />

        {/* Dialog: Record Offline Payment */}
        <OfflinePaymentDialog
          open={openOfflineDialog}
          onClose={() => setOpenOfflineDialog(false)}
          payingInstallment={payingInstallment}
          amount={offlineAmount}
          onChangeAmount={setOfflineAmount}
          method={offlineMethod}
          onChangeMethod={setOfflineMethod}
          date={offlineDate}
          onChangeDate={setOfflineDate}
          note={offlineNote}
          onChangeNote={setOfflineNote}
          onSubmit={(installmentId, payload) =>
            recordOfflinePaymentMutation.mutate({ installmentId, payload })
          }
          isSubmitting={recordOfflinePaymentMutation.isPending}
        />

        {/* Dialog: Add Concession or Additional Charge */}
        <FeeAdjustmentDialog
          open={openAdjustmentDialog}
          onClose={() => setOpenAdjustmentDialog(false)}
          form={adjPayload}
          onChangeForm={setAdjPayload}
          onSubmit={() => {
            if (!viewingAssignmentId) return;
            applyAdjustmentMutation.mutate({
              assignmentId: viewingAssignmentId,
              payload: adjPayload,
            });
          }}
          isSubmitting={applyAdjustmentMutation.isPending}
        />

        {/* Dialog: Printable Fee Receipt Modal */}
        <FeeReceiptDialog
          open={openReceiptDialog}
          onClose={() => setOpenReceiptDialog(false)}
          receiptDetail={receiptDetail}
          isLoading={loadingReceipt}
        />

        {/* Dialog: Webhook Payload Viewer */}
        <WebhookPayloadDialog
          open={Boolean(viewingWebhook)}
          onClose={() => setViewingWebhook(null)}
          webhook={viewingWebhook}
          onRetry={(eventId) => retryWebhookMutation.mutate(eventId)}
          isRetrying={retryWebhookMutation.isPending}
        />
      </AppShell>
    </RequireRole>
  );
}
