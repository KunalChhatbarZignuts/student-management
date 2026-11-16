'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import { ForgotPasswordFormData } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import { ForgotPasswordCard } from '@/features/auth/components';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await authApi.forgotPassword(data);
    } catch {
      // Intentionally suppress enumeration details
    } finally {
      // ALWAYS show the exact same success message
      setSubmitted(true);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <ForgotPasswordCard onSubmit={handleSubmit} submitted={submitted} />
    </Box>
  );
}
