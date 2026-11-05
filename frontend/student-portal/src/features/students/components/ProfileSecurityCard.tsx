'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Link from 'next/link';
import LockResetIcon from '@mui/icons-material/LockReset';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';

interface ProfileSecurityCardProps {
  onLogoutAllClick: () => void;
}

export const ProfileSecurityCard: React.FC<ProfileSecurityCardProps> = ({
  onLogoutAllClick,
}) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Security Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manage password updates and active sessions across devices.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Button
          component={Link}
          href="/change-password"
          variant="outlined"
          startIcon={<LockResetIcon />}
        >
          Change Password
        </Button>

        <Button
          variant="outlined"
          color="error"
          startIcon={<DevicesOtherIcon />}
          onClick={onLogoutAllClick}
        >
          Log Out from All Devices
        </Button>
      </Box>
    </Paper>
  );
};

