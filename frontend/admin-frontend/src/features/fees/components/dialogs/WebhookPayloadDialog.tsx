'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';

import ReplayIcon from '@mui/icons-material/Replay';

import { PaymentWebhookEvent } from '@/features/fees/api';

export interface WebhookPayloadDialogProps {
  open: boolean;
  onClose: () => void;
  webhook: PaymentWebhookEvent | null;
  onRetry: (eventId: string) => void;
  isRetrying: boolean;
}

export default function WebhookPayloadDialog({
  open,
  onClose,
  webhook,
  onRetry,
  isRetrying,
}: WebhookPayloadDialogProps) {
  if (!webhook) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Webhook Event: {webhook.event_id}</DialogTitle>
      <DialogContent dividers>
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Provider</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'uppercase' }}>
                {webhook.gateway_provider}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Event Type</Typography>
              <Typography variant="body2" fontWeight={600}>{webhook.event_type}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Processing Status</Typography>
              <Chip
                label={webhook.processing_status}
                size="small"
                color={webhook.processing_status === 'processed' ? 'success' : webhook.processing_status === 'failed' ? 'error' : 'default'}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Retries</Typography>
              <Typography variant="body2" fontWeight={600}>{webhook.retry_count ?? 0}</Typography>
            </Grid>
          </Grid>

          {webhook.failure_reason && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {webhook.failure_reason}
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
              {JSON.stringify(webhook.raw_payload, null, 2)}
            </pre>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        {webhook.processing_status === 'failed' && (
          <Button
            color="warning"
            startIcon={<ReplayIcon />}
            onClick={() => onRetry(webhook.event_id)}
            disabled={isRetrying}
          >
            Retry Processing
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

