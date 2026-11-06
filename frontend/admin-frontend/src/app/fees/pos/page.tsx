'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Autocomplete,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import {
  POSInstallmentItem,
  POSPaymentReceiptResponse,
  POSStudentAccountDetails,
  POSStudentSearchItem,
} from '@/features/fees/types/pos';
import { feePosApi } from '@/features/fees/api/posApi';
import { POSReceiptModal } from '@/features/fees/components/POSReceiptModal';

export default function FeeCounterPOSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<POSStudentSearchItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<POSStudentSearchItem | null>(null);

  const [loadingLedger, setLoadingLedger] = useState(false);
  const [accountDetails, setAccountDetails] = useState<POSStudentAccountDetails | null>(null);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque'>('cash');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');

  // Allocation Mode: 'auto' (FIFO) or 'manual'
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('auto');
  const [manualAllocations, setManualAllocations] = useState<{ [instId: string]: number }>({});

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<POSPaymentReceiptResponse | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Search students debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        feePosApi
          .searchStudents(searchQuery.trim())
          .then((res) => setSearchResults(res))
          .catch(() => setSearchResults([]))
          .finally(() => setSearching(false));
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Load student ledger when selected
  useEffect(() => {
    if (selectedStudent) {
      setLoadingLedger(true);
      setErrorMessage(null);
      feePosApi
        .getStudentAccountDetails(selectedStudent.student_id)
        .then((res) => {
          setAccountDetails(res);
          // Set default payment amount to total outstanding or next installment
          const outstanding = Number(res.total_outstanding);
          if (outstanding > 0) {
            const firstPending = res.installments.find((i) => Number(i.outstanding_amount) > 0);
            setPaymentAmount(firstPending ? Number(firstPending.outstanding_amount) : outstanding);
          } else {
            setPaymentAmount('');
          }
        })
        .catch((err) => {
          setErrorMessage(err?.response?.data?.detail || 'Failed to load student ledger');
        })
        .finally(() => setLoadingLedger(false));
    } else {
      setAccountDetails(null);
      setPaymentAmount('');
    }
  }, [selectedStudent]);

  const changeReturned =
    paymentMethod === 'cash' && cashTendered !== '' && paymentAmount !== ''
      ? Math.max(0, Number(cashTendered) - Number(paymentAmount))
      : 0;

  const handleManualAllocationChange = (instId: string, val: string) => {
    const num = parseFloat(val) || 0;
    const updated = { ...manualAllocations, [instId]: num };
    setManualAllocations(updated);
    const sum = Object.values(updated).reduce((acc, v) => acc + v, 0);
    setPaymentAmount(sum);
  };

  const handleCollectPayment = async () => {
    if (!selectedStudent || !paymentAmount || paymentAmount <= 0) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        student_id: selectedStudent.student_id,
        total_amount: Number(paymentAmount),
        payment_method: paymentMethod,
        cash_tendered: paymentMethod === 'cash' && cashTendered !== '' ? Number(cashTendered) : undefined,
        transaction_reference: transactionRef.trim() || undefined,
        remarks: remarks.trim() || undefined,
      };

      if (allocationMode === 'manual') {
        payload.allocations = Object.entries(manualAllocations)
          .filter(([_, amt]) => amt > 0)
          .map(([instId, amt]) => ({ installment_id: instId, amount: amt }));
      }

      const receipt = await feePosApi.collectPayment(payload);
      setReceiptData(receipt);
      setReceiptModalOpen(true);

      // Refresh ledger
      if (selectedStudent) {
        feePosApi.getStudentAccountDetails(selectedStudent.student_id).then(setAccountDetails);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'Payment transaction failed. Please check amounts.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <PointOfSaleIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Fee Counter POS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cashier intake terminal: search students, collect payments across payment modes, and issue instant verified receipts.
            </Typography>
          </Box>
        </Box>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
        )}

        {/* Step 1: Student Search Bar */}
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
              LOOKUP STUDENT (BY ADMISSION NO OR NAME)
            </Typography>
            <Autocomplete
              options={searchResults}
              getOptionLabel={(opt) => `${opt.name} (${opt.admission_number}) - ${opt.grade_name} ${opt.section_name}`}
              loading={searching}
              value={selectedStudent}
              onChange={(_, value) => setSelectedStudent(value)}
              onInputChange={(_, value) => setSearchQuery(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type student name or admission number e.g. 'Rohan' or 'ENR-1002'..."
                  size="small"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {searching ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Step 2: Student Account Details & Payment Console */}
        {loadingLedger ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : accountDetails ? (
          <Grid container spacing={3}>
            {/* Left Column: Ledger & Installments */}
            <Grid item xs={12} md={7}>
              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid item xs={4}>
                  <Card sx={{ bgcolor: 'grey.50', border: '1px solid #e2e8f0' }}>
                    <CardContent sx={{ py: 1.5, px: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        TOTAL ANNUAL FEE
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        ₹{Number(accountDetails.total_fee).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card sx={{ bgcolor: 'success.50', border: '1px solid #bbf7d0' }}>
                    <CardContent sx={{ py: 1.5, px: 2 }}>
                      <Typography variant="caption" color="success.dark" fontWeight={600}>
                        TOTAL PAID TO DATE
                      </Typography>
                      <Typography variant="h6" color="success.main" fontWeight={700}>
                        ₹{Number(accountDetails.total_paid).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card sx={{ bgcolor: Number(accountDetails.total_outstanding) > 0 ? 'error.50' : 'grey.50', border: '1px solid', borderColor: Number(accountDetails.total_outstanding) > 0 ? '#fecaca' : '#e2e8f0' }}>
                    <CardContent sx={{ py: 1.5, px: 2 }}>
                      <Typography variant="caption" color={Number(accountDetails.total_outstanding) > 0 ? 'error.dark' : 'text.secondary'} fontWeight={600}>
                        BALANCE DUE
                      </Typography>
                      <Typography variant="h6" color={Number(accountDetails.total_outstanding) > 0 ? 'error.main' : 'text.primary'} fontWeight={700}>
                        ₹{Number(accountDetails.total_outstanding).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Installments Ledger */}
              <Card sx={{ borderRadius: 2, mb: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Fee Installments Ledger
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant={allocationMode === 'auto' ? 'contained' : 'outlined'}
                        onClick={() => setAllocationMode('auto')}
                      >
                        Auto (FIFO)
                      </Button>
                      <Button
                        size="small"
                        variant={allocationMode === 'manual' ? 'contained' : 'outlined'}
                        onClick={() => setAllocationMode('manual')}
                      >
                        Custom Override
                      </Button>
                    </Box>
                  </Box>

                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'grey.100' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Installment</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                          <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Total</TableCell>
                          <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Outstanding</TableCell>
                          {allocationMode === 'manual' && (
                            <TableCell sx={{ fontWeight: 700, textAlign: 'right', width: 130 }}>Pay Amount (₹)</TableCell>
                          )}
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {accountDetails.installments.map((inst) => {
                          const isSettled = Number(inst.outstanding_amount) <= 0;
                          return (
                            <TableRow key={inst.installment_id} hover sx={{ opacity: isSettled ? 0.6 : 1 }}>
                              <TableCell sx={{ fontWeight: 600 }}>{inst.title}</TableCell>
                              <TableCell>{inst.due_date}</TableCell>
                              <TableCell sx={{ textAlign: 'right' }}>₹{Number(inst.total_amount).toLocaleString()}</TableCell>
                              <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: Number(inst.outstanding_amount) > 0 ? 'error.main' : 'text.primary' }}>
                                ₹{Number(inst.outstanding_amount).toLocaleString()}
                              </TableCell>
                              {allocationMode === 'manual' && (
                                <TableCell sx={{ textAlign: 'right' }}>
                                  {!isSettled ? (
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={manualAllocations[inst.installment_id] || ''}
                                      onChange={(e) => handleManualAllocationChange(inst.installment_id, e.target.value)}
                                      placeholder="0.00"
                                      sx={{ width: 110 }}
                                      inputProps={{ max: Number(inst.outstanding_amount), min: 0 }}
                                    />
                                  ) : (
                                    '—'
                                  )}
                                </TableCell>
                              )}
                              <TableCell>
                                <Chip
                                  size="small"
                                  color={inst.status === 'paid' ? 'success' : inst.status === 'partially_paid' ? 'warning' : 'default'}
                                  label={inst.status}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Right Column: Checkout & Tender Console */}
            <Grid item xs={12} md={5}>
              <Card sx={{ borderRadius: 2, position: 'sticky', top: 20 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Collection Console
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Enter payment details to complete intake and issue official receipt.
                  </Typography>

                  {/* Payment Amount */}
                  <TextField
                    label="Payment Amount (₹)"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                    disabled={allocationMode === 'manual'}
                    fullWidth
                    sx={{ mb: 2.5 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                  />

                  {/* Quick Shortcuts */}
                  {allocationMode === 'auto' && Number(accountDetails.total_outstanding) > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setPaymentAmount(Number(accountDetails.total_outstanding))}
                      >
                        Pay All (₹{Number(accountDetails.total_outstanding).toLocaleString()})
                      </Button>
                      {accountDetails.installments.find((i) => Number(i.outstanding_amount) > 0) && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const first = accountDetails.installments.find((i) => Number(i.outstanding_amount) > 0);
                            if (first) setPaymentAmount(Number(first.outstanding_amount));
                          }}
                        >
                          Next Due
                        </Button>
                      )}
                    </Box>
                  )}

                  {/* Payment Method Selector */}
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Payment Mode
                  </Typography>
                  <RadioGroup
                    row
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    sx={{ mb: 2.5 }}
                  >
                    <FormControlLabel value="cash" control={<Radio size="small" />} label="Cash" />
                    <FormControlLabel value="upi" control={<Radio size="small" />} label="UPI" />
                    <FormControlLabel value="card" control={<Radio size="small" />} label="Card" />
                    <FormControlLabel value="bank_transfer" control={<Radio size="small" />} label="Bank / NEFT" />
                    <FormControlLabel value="cheque" control={<Radio size="small" />} label="Cheque" />
                  </RadioGroup>

                  {/* Cash Change Calculation */}
                  {paymentMethod === 'cash' && (
                    <Box sx={{ p: 2, mb: 2.5, bgcolor: '#fef3c7', borderRadius: 2, border: '1px solid #fde68a' }}>
                      <TextField
                        label="Cash Tendered from Parent (₹)"
                        type="number"
                        size="small"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value ? Number(e.target.value) : '')}
                        fullWidth
                        sx={{ mb: 1.5, bgcolor: '#ffffff' }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight={600}>
                          Change to Return:
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color="success.dark">
                          ₹{changeReturned.toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Reference / Remarks */}
                  {paymentMethod !== 'cash' && (
                    <TextField
                      label="Transaction Ref / Cheque No / UPI ID"
                      size="small"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      fullWidth
                      sx={{ mb: 2 }}
                      placeholder="E.g. UPI-92817291 or CHQ-00129"
                    />
                  )}

                  <TextField
                    label="Remarks / Notes (Optional)"
                    size="small"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    fullWidth
                    sx={{ mb: 3 }}
                  />

                  {/* Submit Button */}
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    disabled={submitting || !paymentAmount || paymentAmount <= 0}
                    onClick={handleCollectPayment}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <ReceiptIcon />}
                    sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem' }}
                  >
                    {submitting ? 'Processing Payment...' : `Collect ₹${paymentAmount ? Number(paymentAmount).toLocaleString() : '0.00'} & Print`}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2, bgcolor: 'grey.50' }}>
            <PointOfSaleIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1.5 }} />
            <Typography variant="h6" fontWeight={600}>
              No Student Selected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use the search bar above to look up any enrolled student by admission number or name.
            </Typography>
          </Paper>
        )}

        {/* Modal Receipt Preview & Print */}
        <POSReceiptModal
          open={receiptModalOpen}
          receipt={receiptData}
          onClose={() => setReceiptModalOpen(false)}
        />
      </Box>
    </RequireRole>
  );
}
