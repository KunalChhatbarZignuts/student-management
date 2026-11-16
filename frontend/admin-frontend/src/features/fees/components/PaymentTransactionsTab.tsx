'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
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
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';

import ReceiptIcon from '@mui/icons-material/Receipt';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';

import { PaginatedTransactionsResponse, adminFeeApi } from '@/features/fees/api';

export interface PaymentTransactionsTabProps {
  txStatusFilter: string;
  onStatusFilterChange: (val: string) => void;
  txMethodFilter: string;
  onMethodFilterChange: (val: string) => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  transactionsData?: PaginatedTransactionsResponse;
  isLoading: boolean;
  onViewReceipt: (receiptNumber: string) => void;
}

export default function PaymentTransactionsTab({
  txStatusFilter,
  onStatusFilterChange,
  txMethodFilter,
  onMethodFilterChange,
  searchQuery = '',
  onSearchChange,
  transactionsData,
  isLoading,
  onViewReceipt,
}: PaymentTransactionsTabProps) {
  const [downloadingReceipt, setDownloadingReceipt] = React.useState<string | null>(null);

  const handleDownloadPdf = async (receiptNumber: string) => {
    try {
      setDownloadingReceipt(receiptNumber);
      const blob = await adminFeeApi.downloadReceiptPdf(receiptNumber);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt_${receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF receipt:', err);
    } finally {
      setDownloadingReceipt(null);
    }
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {onSearchChange && (
          <TextField
            size="small"
            placeholder="Search student, order or payment ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 260 }}
          />
        )}

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={txStatusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
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
            onChange={(e) => onMethodFilterChange(e.target.value)}
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
              <TableCell sx={{ fontWeight: 700 }}>Parent</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Installment</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Provider / Method</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Order ID / Ref</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Amount (₹)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Receipt & Download</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : !transactionsData?.items || transactionsData.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No payment transactions recorded for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              transactionsData.items.map((tx) => (
                <TableRow key={tx.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {tx.payment_timestamp
                        ? new Date(tx.payment_timestamp).toLocaleDateString()
                        : new Date(tx.created_at).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(tx.payment_timestamp || tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {tx.student_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tx.enrollment_number || tx.student_code || tx.grade_name || 'Student'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {tx.parent_name || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{tx.installment_name || 'Installment'}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        tx.payment_method
                          ? tx.payment_method.replace('_', ' ').toUpperCase()
                          : tx.gateway_provider.toUpperCase()
                      }
                      size="small"
                      variant="outlined"
                      color={tx.gateway_provider === 'razorpay' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                      {tx.gateway_order_id}
                    </Typography>
                    {tx.gateway_payment_id && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>
                        Pay ID: {tx.gateway_payment_id}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
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
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={`View Receipt: ${tx.receipt_number}`}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ReceiptIcon fontSize="small" />}
                            onClick={() => onViewReceipt(tx.receipt_number!)}
                          >
                            {tx.receipt_number}
                          </Button>
                        </Tooltip>
                        <Tooltip title="Download PDF">
                          <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            onClick={() => handleDownloadPdf(tx.receipt_number!)}
                            disabled={downloadingReceipt === tx.receipt_number}
                            sx={{ minWidth: 36, px: 1 }}
                          >
                            {downloadingReceipt === tx.receipt_number ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <DownloadIcon fontSize="small" />
                            )}
                          </Button>
                        </Tooltip>
                      </Box>
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
  );
}

