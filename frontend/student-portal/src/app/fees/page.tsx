'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { PageHeader } from '@/components/ui/PageHeader';
import { ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { useMyChildren } from '@/features/parents/hooks';
import { portalFeeApi } from '@/features/fees/api';
import { PortalInstallmentItem } from '@/features/fees/types';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

import {
  StudentFeeSummaryCards,
  FeeInstallmentsTable,
  InitiatePaymentDialog,
  FeeReceiptDialog,
} from '@/features/fees/components';

// Helper to dynamically load the Razorpay checkout.js script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function FeesPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const { role } = useAuth();
  const isParent = role === ROLES.PARENT;

  const { data: children, isLoading: loadingChildren } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const selectedChild = children && children.length > 0 ? children[selectedChildIndex] : null;

  // Pay Dialog State
  const [openPayDialog, setOpenPayDialog] = React.useState(false);
  const [selectedInstallment, setSelectedInstallment] = React.useState<PortalInstallmentItem | null>(null);
  const [payAmount, setPayAmount] = React.useState<number>(0);

  // Receipt Dialog State
  const [openReceiptDialog, setOpenReceiptDialog] = React.useState(false);
  const [viewingReceiptNumber, setViewingReceiptNumber] = React.useState<string | null>(null);

  // Fetch Fee Schedule
  const {
    data: schedule,
    isLoading: loadingSchedule,
    isError,
    error,
  } = useQuery({
    queryKey: ['portal-fees', 'schedule', isParent ? selectedChild?.id : 'me'],
    queryFn: () => {
      if (isParent) {
        if (!selectedChild?.id) return null;
        return portalFeeApi.getChildFeeSchedule(selectedChild.id);
      }
      return portalFeeApi.getMyFeeSchedule();
    },
    enabled: isParent ? Boolean(selectedChild?.id) : true,
  });

  // Fetch Receipt Detail
  const { data: receiptDetail, isLoading: loadingReceipt } = useQuery({
    queryKey: ['portal-fees', 'receipt', viewingReceiptNumber],
    queryFn: () => portalFeeApi.getReceiptDetail(viewingReceiptNumber!),
    enabled: Boolean(viewingReceiptNumber),
  });

  // Razorpay Order Creation Mutation
  const createOrderMutation = useMutation({
    mutationFn: (payload: { installment_id: string; amount?: number }) =>
      portalFeeApi.createPaymentOrder(payload),
    onError: (err) =>
      showSnackbar(formatErrorMessage(err, 'Failed to initialize payment gateway order'), 'error'),
  });

  // Payment Verification Mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: portalFeeApi.verifyPayment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-fees'] });
      showSnackbar(data.message || 'Payment successfully processed!', 'success');
      setOpenPayDialog(false);
      if (data.receipt_number) {
        setViewingReceiptNumber(data.receipt_number);
        setOpenReceiptDialog(true);
      }
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Payment verification failed'), 'error');
      queryClient.invalidateQueries({ queryKey: ['portal-fees'] });
    },
  });

  const handleOpenPayModal = (inst: PortalInstallmentItem) => {
    setSelectedInstallment(inst);
    setPayAmount(Number(inst.outstanding_amount));
    setOpenPayDialog(true);
  };

  const handleStartPayment = async () => {
    if (!selectedInstallment) return;
    if (payAmount <= 0) {
      showSnackbar('Please enter a payment amount greater than zero', 'error');
      return;
    }
    if (payAmount > Number(selectedInstallment.outstanding_amount)) {
      showSnackbar('Payment amount cannot exceed outstanding balance', 'error');
      return;
    }

    try {
      const order = await createOrderMutation.mutateAsync({
        installment_id: selectedInstallment.id,
        amount: payAmount,
      });

      // Check if running with development placeholder credentials
      const isDevPlaceholder =
        !order.key_id ||
        order.key_id === 'rzp_test_placeholder' ||
        order.key_id.includes('placeholder') ||
        order.key_id.startsWith('mock_');

      if (isDevPlaceholder) {
        showSnackbar('Processing payment in development sandbox mode...', 'info');
        const simPaymentId = `pay_sim_${Date.now()}`;
        const simSignature = `sim_sig_${order.order_id}_${simPaymentId}`;
        verifyPaymentMutation.mutate({
          gateway_order_id: order.order_id,
          gateway_payment_id: simPaymentId,
          gateway_signature: simSignature,
        });
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !(window as any).Razorpay) {
        showSnackbar(
          'Razorpay SDK blocked or unavailable. Falling back to sandbox verification...',
          'warning'
        );
        const simPaymentId = `pay_sim_${Date.now()}`;
        const simSignature = `sim_sig_${order.order_id}_${simPaymentId}`;
        verifyPaymentMutation.mutate({
          gateway_order_id: order.order_id,
          gateway_payment_id: simPaymentId,
          gateway_signature: simSignature,
        });
        return;
      }

      // Standard Razorpay Checkout for live / registered merchant test keys
      const options = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency || 'INR',
        name: 'Student Management Academy',
        description: `${order.student_name} - ${order.installment_name}`,
        order_id: order.order_id,
        handler: function (response: any) {
          verifyPaymentMutation.mutate({
            gateway_order_id: response.razorpay_order_id || order.order_id,
            gateway_payment_id: response.razorpay_payment_id,
            gateway_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: order.student_name,
        },
        theme: {
          color: '#1976d2',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        showSnackbar(
          resp.error?.description || 'Transaction cancelled or failed at gateway.',
          'error'
        );
      });
      rzp.open();
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleSimulatePayment = () => {
    if (!selectedInstallment) return;
    createOrderMutation.mutate(
      { installment_id: selectedInstallment.id, amount: payAmount },
      {
        onSuccess: (order) => {
          const simPaymentId = `pay_sim_${Date.now()}`;
          const simSignature = `sim_sig_${order.order_id}_${simPaymentId}`;
          verifyPaymentMutation.mutate({
            gateway_order_id: order.order_id,
            gateway_payment_id: simPaymentId,
            gateway_signature: simSignature,
          });
        },
      }
    );
  };

  return (
    <RequireRole roles={[ROLES.PARENT]}>
      <AppShell>
        <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
          <PageHeader
            title="Fee Schedule & Online Payments"
            subtitle="Review assigned fee structures, track upcoming and overdue installments, pay fees securely online, and download official receipts."
          />

          {/* Parent: Multi-child Switcher */}
          {isParent && children && children.length > 0 && (
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={selectedChildIndex}
                onChange={(_, val) => setSelectedChildIndex(val)}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
              >
                {children.map((child) => (
                  <Tab
                    key={child.id}
                    label={`${child.first_name} ${child.last_name}`}
                  />
                ))}
              </Tabs>
            </Paper>
          )}

          {/* Loading or Empty State */}
          {loadingSchedule || (isParent && loadingChildren) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : isError || !schedule ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', my: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                No Active Fee Schedule Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatErrorMessage(
                  error,
                  'No fee assignment has been published for this student profile yet. Please check back later or contact the administration office.'
                )}
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Student Info Banner */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {schedule.student_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enrollment: <code>{schedule.student_code || 'Enrolled'}</code> • Grade:{' '}
                      <b>{schedule.grade_name}</b>
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <Typography variant="body2" color="text.secondary">
                      Academic Session: <b>{schedule.academic_year_name}</b>
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <StudentFeeSummaryCards schedule={schedule} />

              <FeeInstallmentsTable
                installments={schedule.installments}
                onPayNow={handleOpenPayModal}
                onViewReceipt={(receiptNum) => {
                  setViewingReceiptNumber(receiptNum);
                  setOpenReceiptDialog(true);
                }}
              />
            </>
          )}

          {/* Pay Online Modal */}
          <InitiatePaymentDialog
            open={openPayDialog}
            onClose={() => setOpenPayDialog(false)}
            selectedInstallment={selectedInstallment}
            payAmount={payAmount}
            onPayAmountChange={setPayAmount}
            onStartPayment={handleStartPayment}
            onSimulatePayment={handleSimulatePayment}
            isProcessing={createOrderMutation.isPending || verifyPaymentMutation.isPending}
          />

          {/* Printable Fee Receipt Modal */}
          <FeeReceiptDialog
            open={openReceiptDialog}
            onClose={() => setOpenReceiptDialog(false)}
            receiptDetail={receiptDetail}
            isLoading={loadingReceipt}
          />
        </Box>
      </AppShell>
    </RequireRole>
  );
}
