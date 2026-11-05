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
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import InputAdornment from '@mui/material/InputAdornment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { StudentFeeAdjustmentItem } from '@/features/fees/api';
import { FeeStructure } from '@/features/fees/types';

export interface FeeAdjustmentStepProps {
  enableFeeAssignment: boolean;
  onToggleEnableFeeAssignment: (val: boolean) => void;
  loadingFeeStructure: boolean;
  activeFeeStructure?: FeeStructure | null;
  selectedGrade?: { name: string } | null;
  selectedComponentIds: string[];
  onToggleComponentId: (componentId: string, checked: boolean) => void;
  adjustments: StudentFeeAdjustmentItem[];
  onAddAdjustment: () => void;
  onRemoveAdjustment: (index: number) => void;
  onUpdateAdjustment: (index: number, updates: Partial<StudentFeeAdjustmentItem>) => void;
  installmentFrequency: string;
  onInstallmentFrequencyChange: (freq: string) => void;
  computedFees: {
    base: number;
    discounts: number;
    additional: number;
    final: number;
    installments: { number: number; name: string; amount: number }[];
  };
  onNext: () => void;
  onBack: () => void;
}

export const FeeAdjustmentStep: React.FC<FeeAdjustmentStepProps> = ({
  enableFeeAssignment,
  onToggleEnableFeeAssignment,
  loadingFeeStructure,
  activeFeeStructure,
  selectedGrade,
  selectedComponentIds,
  onToggleComponentId,
  adjustments,
  onAddAdjustment,
  onRemoveAdjustment,
  onUpdateAdjustment,
  installmentFrequency,
  onInstallmentFrequencyChange,
  computedFees,
  onNext,
  onBack,
}) => {
  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceWalletIcon color="primary" sx={{ fontSize: 28 }} />
          <div>
            <Typography variant="h6" fontWeight={700}>
              Step 4: Grade Fee Configuration & Adjustments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Grade-level fee plan automatically resolved. Configure optional fees, scholarships,
              and installment schedules.
            </Typography>
          </div>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={enableFeeAssignment}
              onChange={(e) => onToggleEnableFeeAssignment(e.target.checked)}
              color="primary"
            />
          }
          label={enableFeeAssignment ? 'Fee Assignment Active' : 'Skip Fee Assignment'}
        />
      </Box>

      {loadingFeeStructure ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : !activeFeeStructure ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No active fee structure is currently configured for{' '}
          <strong>{selectedGrade?.name || 'Selected Grade'}</strong> in this academic year. You can
          still complete admission without a fee schedule, or configure a fee plan under{' '}
          <strong>Fee Management</strong>.
        </Alert>
      ) : (
        enableFeeAssignment && (
          <Box>
            {/* Structure Details Card */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {activeFeeStructure.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Applicable for: Grade {selectedGrade?.name} • Session:{' '}
                    {activeFeeStructure.academic_year_name}
                  </Typography>
                </Box>
                <Chip label="Grade-Wise Plan Active" color="success" size="small" />
              </Box>
            </Paper>

            {/* Components Selection Table */}
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Fee Components & Optional Add-ons
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell padding="checkbox">Include</TableCell>
                    <TableCell>Component</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Nature</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeFeeStructure.items.map((it) => {
                    const isMandatory = it.is_mandatory;
                    const isChecked =
                      isMandatory || selectedComponentIds.includes(it.fee_component_id);
                    return (
                      <TableRow key={it.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isChecked}
                            disabled={isMandatory}
                            onChange={(e) =>
                              onToggleComponentId(it.fee_component_id, e.target.checked)
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {it.component_name || 'Component'}
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>
                          {it.payment_frequency}
                        </TableCell>
                        <TableCell>
                          {isMandatory ? (
                            <Chip
                              label="Mandatory"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ) : (
                            <Chip label="Optional Add-on" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          ₹{Number(it.amount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Individual Student Fee Adjustments */}
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1.5,
                }}
              >
                <div>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Individual Student Fee Adjustments
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Apply scholarships, sibling discounts, or custom additional charges.
                  </Typography>
                </div>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={onAddAdjustment}
                >
                  Add Adjustment
                </Button>
              </Box>

              {adjustments.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}
                >
                  <Typography variant="body2">
                    No individual adjustments applied for this student.
                  </Typography>
                </Paper>
              ) : (
                adjustments.map((adj, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Adjustment Type</InputLabel>
                          <Select
                            label="Adjustment Type"
                            value={adj.adjustment_type}
                            onChange={(e) =>
                              onUpdateAdjustment(idx, { adjustment_type: e.target.value })
                            }
                          >
                            <MenuItem value="DISCOUNT_FIXED">Discount (Fixed ₹)</MenuItem>
                            <MenuItem value="DISCOUNT_PERCENTAGE">Discount (Percentage %)</MenuItem>
                            <MenuItem value="CONCESSION_SCHOLARSHIP">Scholarship Concession</MenuItem>
                            <MenuItem value="CONCESSION_FINANCIAL">Financial Concession</MenuItem>
                            <MenuItem value="CONCESSION_SPECIAL">Special Institutional Concession</MenuItem>
                            <MenuItem value="ADDITIONAL_CHARGE">Additional Charge</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} sm={2}>
                        {adj.calculation_type === 'percentage' ||
                        adj.adjustment_type === 'DISCOUNT_PERCENTAGE' ? (
                          <TextField
                            label="Rate (%)"
                            type="number"
                            size="small"
                            fullWidth
                            value={adj.rate ?? ''}
                            onChange={(e) =>
                              onUpdateAdjustment(idx, {
                                calculation_type: 'percentage',
                                rate: parseFloat(e.target.value) || 0,
                              })
                            }
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                          />
                        ) : (
                          <TextField
                            label="Amount (₹)"
                            type="number"
                            size="small"
                            fullWidth
                            value={adj.amount}
                            onChange={(e) =>
                              onUpdateAdjustment(idx, {
                                calculation_type: 'fixed',
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                            }}
                          />
                        )}
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Reason / Description (Mandatory)"
                          required
                          size="small"
                          fullWidth
                          placeholder="e.g. Merit scholarship 10%, sibling discount..."
                          value={adj.description}
                          onChange={(e) =>
                            onUpdateAdjustment(idx, { description: e.target.value })
                          }
                        />
                      </Grid>

                      <Grid item xs={12} sm={1} sx={{ textAlign: 'center' }}>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => onRemoveAdjustment(idx)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))
              )}
            </Box>

            {/* Payment Installment Frequency & Financial Summary */}
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Installment Schedule Configuration
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Payment Frequency</InputLabel>
                    <Select
                      label="Payment Frequency"
                      value={installmentFrequency}
                      onChange={(e) => onInstallmentFrequencyChange(e.target.value)}
                    >
                      <MenuItem value="annual">Annually (1 payment)</MenuItem>
                      <MenuItem value="half_yearly">Half-Yearly (2 installments)</MenuItem>
                      <MenuItem value="quarterly">Quarterly (4 installments)</MenuItem>
                      <MenuItem value="monthly">Monthly (10 installments)</MenuItem>
                      <MenuItem value="one_time">One-time at Admission</MenuItem>
                    </Select>
                  </FormControl>

                  <Typography variant="caption" color="text.secondary" display="block">
                    Installments will reconcile to the final payable amount. Due dates are spaced
                    automatically across the academic session.
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={7}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    height: '100%',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Payable Fee Calculation
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Configured Base Fee:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      ₹{computedFees.base.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 0.5,
                      color: 'success.main',
                    }}
                  >
                    <Typography variant="body2">Discounts & Concessions:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      -₹{computedFees.discounts.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 0.5,
                      color: 'error.main',
                    }}
                  >
                    <Typography variant="body2">Additional Charges:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      +₹{computedFees.additional.toLocaleString()}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700}>
                      Final Payable Amount:
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                      ₹{computedFees.final.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 0.5 }}
                  >
                    Split into {computedFees.installments.length} installment(s)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )
      )}

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
          Continue to Final Review
        </Button>
      </Box>
    </Card>
  );
};

