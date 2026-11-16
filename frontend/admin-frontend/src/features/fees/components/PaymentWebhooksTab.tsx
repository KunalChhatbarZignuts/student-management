'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
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
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplayIcon from '@mui/icons-material/Replay';

import { PaginatedWebhookEventsResponse, PaymentWebhookEvent } from '@/features/fees/api';

export interface PaymentWebhooksTabProps {
  webhookStatusFilter: string;
  onStatusFilterChange: (val: string) => void;
  webhooksData?: PaginatedWebhookEventsResponse;
  isLoading: boolean;
  onViewWebhookPayload: (ev: PaymentWebhookEvent) => void;
  onRetryWebhook: (eventId: string) => void;
  isRetrying: boolean;
}

export default function PaymentWebhooksTab({
  webhookStatusFilter,
  onStatusFilterChange,
  webhooksData,
  isLoading,
  onViewWebhookPayload,
  onRetryWebhook,
  isRetrying,
}: PaymentWebhooksTabProps) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={webhookStatusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
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
            {isLoading ? (
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
                      <IconButton size="small" onClick={() => onViewWebhookPayload(ev)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {ev.processing_status === 'failed' && (
                      <Tooltip title="Retry Processing Webhook">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => onRetryWebhook(ev.event_id)}
                          disabled={isRetrying}
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
  );
}

