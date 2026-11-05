'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';

import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

export interface CreatedParentCredentials {
  name: string;
  identifier: string;
  phone?: string;
  password?: string;
  portalUrl: string;
}

export interface ParentCredentialsDialogProps {
  credentials: CreatedParentCredentials | null;
  onClose: () => void;
}

export default function ParentCredentialsDialog({
  credentials,
  onClose,
}: ParentCredentialsDialogProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!credentials) return;
    const text = `Parent Portal Login Credentials:\nName: ${credentials.name}\nEmail: ${credentials.identifier}\nPassword: ${credentials.password || 'Set via invite link'}\nPortal URL: ${credentials.portalUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={Boolean(credentials)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <VpnKeyIcon color="primary" /> Parent Account Credentials Created
      </DialogTitle>
      <DialogContent dividers>
        {credentials && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="success">
              Parent account created successfully. The parent can log in immediately to the Parent Portal using these credentials:
            </Alert>
            <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'background.default', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">PARENT / GUARDIAN NAME</Typography>
              <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
                {credentials.name}
              </Typography>

              <Typography variant="caption" color="text.secondary">LOGIN IDENTIFIER (EMAIL)</Typography>
              <Typography variant="body1" fontWeight={600} color="primary.main" sx={{ mb: 1.5 }}>
                {credentials.identifier}
              </Typography>

              {credentials.phone && (
                <>
                  <Typography variant="caption" color="text.secondary">REGISTERED PHONE</Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 1.5 }}>
                    {credentials.phone}
                  </Typography>
                </>
              )}

              <Typography variant="caption" color="text.secondary">PASSWORD</Typography>
              <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5, fontFamily: 'monospace', letterSpacing: 1 }}>
                {credentials.password || 'Set via invite link'}
              </Typography>

              <Typography variant="caption" color="text.secondary">PORTAL LOGIN URL</Typography>
              <Typography variant="body2" color="text.secondary">
                {credentials.portalUrl}
              </Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
          onClick={handleCopy}
        >
          {copied ? 'Copied to Clipboard' : 'Copy Credentials'}
        </Button>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

