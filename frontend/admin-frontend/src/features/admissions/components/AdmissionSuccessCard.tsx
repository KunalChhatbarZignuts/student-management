import * as React from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyIcon from '@mui/icons-material/Key';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LaunchIcon from '@mui/icons-material/Launch';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SchoolIcon from '@mui/icons-material/School';

import { AdmissionResponse } from '@/features/admissions/types';

export interface AdmissionSuccessCardProps {
  admissionResult: AdmissionResponse;
  onCopyCredentials: () => void;
  onAdmitAnother: () => void;
}

export const AdmissionSuccessCard: React.FC<AdmissionSuccessCardProps> = ({
  admissionResult,
  onCopyCredentials,
  onAdmitAnother,
}) => {
  return (
    <Card sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center' }}>
      <Box
        sx={{
          display: 'inline-flex',
          p: 2,
          borderRadius: '50%',
          bgcolor: 'success.light',
          color: 'success.dark',
          mb: 2,
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 48 }} />
      </Box>

      <Typography variant="h4" fontWeight={700} gutterBottom>
        Admission Completed Successfully!
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}
      >
        The student has been enrolled, fee schedule assigned, and all associated accounts
        provisioned.
      </Typography>

      {/* Key Identifiers Cards */}
      <Grid container spacing={2} sx={{ mb: 4, textAlign: 'left' }}>
        <Grid item xs={12} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              ENROLLMENT NUMBER
            </Typography>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              {admissionResult.student.enrollment_number}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Student ID
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              ADMISSION NUMBER
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {admissionResult.admission_number}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Registry Ref
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              CLASS & ROLL NO
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {admissionResult.academic.grade_name} - {admissionResult.academic.section_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Roll No: #{admissionResult.academic.roll_no}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              ASSIGNED FEES
            </Typography>
            <Typography variant="h5" fontWeight={700} color="success.main">
              {admissionResult.fee_assignment
                ? `₹${Number(admissionResult.fee_assignment.final_payable_amount).toLocaleString()}`
                : 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {admissionResult.fee_assignment
                ? `${admissionResult.fee_assignment.installments.length} installment(s)`
                : 'No fees assigned'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Login Credentials Card */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          bgcolor: 'background.paper',
          borderColor: 'primary.light',
          textAlign: 'left',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              Portal Login Credentials
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={onCopyCredentials}
            size="small"
          >
            Copy All Credentials
          </Button>
        </Box>

        <Grid container spacing={2}>
          {/* Student Portal Account */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Student Portal Access
              </Typography>
              {admissionResult.student_account.initial_password ? (
                <>
                  <Typography variant="body2">
                    <strong>Login Identifier:</strong>{' '}
                    {admissionResult.student.enrollment_number}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Registered Email:</strong>{' '}
                    {admissionResult.student_account.email}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Temporary Password:</strong>{' '}
                    <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4 }}>
                      {admissionResult.student_account.initial_password}
                    </code>
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No student login account was requested during this admission.
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Parents Portal Access */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Parent & Guardian Portal Access
              </Typography>
              {admissionResult.parents.map((p, idx) => (
                <Box key={p.parent_id || idx} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>
                      {p.first_name} {p.last_name} ({p.relationship_type}):
                    </strong>
                  </Typography>
                  <Typography variant="caption" display="block">
                    Email: {p.email}
                  </Typography>
                  {p.initial_password ? (
                    <Typography variant="caption" display="block">
                      Password:{' '}
                      <code style={{ background: '#eee', padding: '1px 5px', borderRadius: 4 }}>
                        {p.initial_password}
                      </code>
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Existing account linked successfully.
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LaunchIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            Students and parents can log in directly at{' '}
            <a
              href="http://localhost:3001/login"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 600 }}
            >
              http://localhost:3001/login
            </a>
          </Typography>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="large"
          onClick={onAdmitAnother}
          startIcon={<AddIcon />}
        >
          Admit Another Student
        </Button>
        <Button
          component={Link}
          href="/fees"
          variant="outlined"
          size="large"
          startIcon={<AccountBalanceWalletIcon />}
        >
          View in Fee Management
        </Button>
        <Button
          component={Link}
          href="/students"
          variant="contained"
          size="large"
          startIcon={<SchoolIcon />}
        >
          View Students Directory
        </Button>
      </Box>
    </Card>
  );
};

