'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

interface PasswordRuleChecklistProps {
  password?: string;
}

export function evaluatePassword(pwd = '') {
  return [
    { label: 'At least 10 characters', valid: pwd.length >= 10 },
    { label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(pwd) },
    { label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(pwd) },
    { label: 'One number (0-9)', valid: /[0-9]/.test(pwd) },
    { label: 'One special symbol (!@#$%^&*)', valid: /[^A-Za-z0-9]/.test(pwd) },
  ];
}

export default function PasswordRuleChecklist({ password = '' }: PasswordRuleChecklistProps) {
  const rules = evaluatePassword(password);
  const metCount = rules.filter((r) => r.valid).length;
  const strengthPercent = (metCount / rules.length) * 100;

  let color: 'error' | 'warning' | 'info' | 'success' = 'error';
  let strengthLabel = 'Very Weak';

  if (metCount >= 5) {
    color = 'success';
    strengthLabel = 'Strong';
  } else if (metCount >= 3) {
    color = 'warning';
    strengthLabel = 'Medium';
  } else if (metCount >= 1) {
    color = 'error';
    strengthLabel = 'Weak';
  }

  return (
    <Box sx={{ mt: 1, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Password Strength
        </Typography>
        <Typography variant="caption" color={`${color}.main`} fontWeight={600}>
          {strengthLabel}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={strengthPercent}
        color={color}
        sx={{ height: 6, borderRadius: 3, mb: 1.5 }}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {rules.map((rule) => (
          <Box key={rule.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {rule.valid ? (
              <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            )}
            <Typography
              variant="caption"
              color={rule.valid ? 'text.primary' : 'text.disabled'}
              fontWeight={rule.valid ? 500 : 400}
            >
              {rule.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
