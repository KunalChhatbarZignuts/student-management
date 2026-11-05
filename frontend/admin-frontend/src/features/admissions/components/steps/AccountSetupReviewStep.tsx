import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AutoRenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { ParentFormItem, StudentFormData } from '@/features/admissions/types';
import { FeeStructure } from '@/features/fees/types';

export interface AccountSetupReviewStepProps {
  createStudentAccount: boolean;
  onToggleCreateStudentAccount: (val: boolean) => void;
  studentPassword: string;
  onStudentPasswordChange: (val: string) => void;
  generatePassword: () => string;
  studentData: StudentFormData;
  selectedGrade?: { name: string } | null;
  selectedSection?: { name: string } | null;
  admissionDate: string;
  sectionTeacher?: { teacher_name?: string | null } | null;
  enableFeeAssignment: boolean;
  activeFeeStructure?: FeeStructure | null;
  computedFees: {
    base: number;
    discounts: number;
    additional: number;
    final: number;
    installments: { number: number; name: string; amount: number }[];
  };
  installmentFrequency: string;
  parents: ParentFormItem[];
  onSubmit: () => void;
  isSubmitting: boolean;
  onBack: () => void;
}

export const AccountSetupReviewStep: React.FC<AccountSetupReviewStepProps> = ({
  createStudentAccount,
  onToggleCreateStudentAccount,
  studentPassword,
  onStudentPasswordChange,
  generatePassword,
  studentData,
  selectedGrade,
  selectedSection,
  admissionDate,
  sectionTeacher,
  enableFeeAssignment,
  activeFeeStructure,
  computedFees,
  installmentFrequency,
  parents,
  onSubmit,
  isSubmitting,
  onBack,
}) => {
  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <VerifiedUserIcon color="primary" sx={{ fontSize: 28 }} />
        <div>
          <Typography variant="h6" fontWeight={700}>
            Step 5: Account Configuration & Final Review
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review all admission details before committing. The backend will atomically create the
            student record, parent links, fee schedule, and portal credentials.
          </Typography>
        </div>
      </Box>

      {/* Student Portal Account Configuration */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Student Portal Account Provisioning
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enable portal login access for the student. Students log in using their unique
              Enrollment Number (e.g. STU-2026-00001) or email.
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={createStudentAccount}
                onChange={(e) => onToggleCreateStudentAccount(e.target.checked)}
                color="primary"
              />
            }
            label={createStudentAccount ? 'Account Enabled' : 'Disabled'}
          />
        </Box>

        {createStudentAccount && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Initial Student Password"
                  fullWidth
                  value={studentPassword}
                  onChange={(e) => onStudentPasswordChange(e.target.value)}
                />
                <Tooltip title="Generate secure password">
                  <IconButton
                    color="primary"
                    onClick={() => onStudentPasswordChange(generatePassword())}
                    sx={{ alignSelf: 'center', border: 1, borderColor: 'divider' }}
                  >
                    <AutoRenewIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Review Summaries */}
      <Grid container spacing={2.5}>
        {/* Student Review */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="primary" fontWeight={700} gutterBottom>
              STUDENT DETAILS
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {studentData.firstName}{' '}
              {studentData.middleName ? `${studentData.middleName} ` : ''}
              {studentData.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              DOB: {studentData.dob} • Gender: {studentData.gender}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email: {studentData.email || 'Auto-generated on submission'}
            </Typography>
            {studentData.phone && (
              <Typography variant="body2" color="text.secondary">
                Phone: {studentData.phone}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Academic Placement Review */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="primary" fontWeight={700} gutterBottom>
              ACADEMIC PLACEMENT
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              Grade: {selectedGrade?.name} — Section: {selectedSection?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Admission Date: {admissionDate}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Class Teacher: {sectionTeacher?.teacher_name || 'None currently assigned'}
            </Typography>
          </Paper>
        </Grid>

        {/* Fee Assignment Review */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Typography variant="subtitle2" color="primary" fontWeight={700}>
                FEE ASSIGNMENT SUMMARY
              </Typography>
              {enableFeeAssignment && activeFeeStructure && (
                <Chip
                  label={`Payable: ₹${computedFees.final.toLocaleString()} (${installmentFrequency})`}
                  color="primary"
                  size="small"
                />
              )}
            </Box>

            {enableFeeAssignment && activeFeeStructure ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Plan:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {activeFeeStructure.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Base / Adjustments:
                  </Typography>
                  <Typography variant="body2">
                    Base: ₹{computedFees.base.toLocaleString()} • Disc: -₹
                    {computedFees.discounts.toLocaleString()} • Add: +₹
                    {computedFees.additional.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Schedule:
                  </Typography>
                  <Typography variant="body2">
                    {computedFees.installments.length} installment(s)
                  </Typography>
                </Grid>
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Fee assignment skipped for this admission.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Parents Review */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="primary" fontWeight={700} gutterBottom>
              PARENTS & GUARDIANS ({parents.length})
            </Typography>
            <Grid container spacing={2}>
              {parents.map((p) => (
                <Grid item xs={12} sm={6} key={p.id}>
                  <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {p.isExisting && p.existingParent
                          ? `${p.existingParent.first_name} ${p.existingParent.last_name}`
                          : `${p.firstName} ${p.lastName}`}
                      </Typography>
                      <Chip label={p.relationshipType} size="small" />
                      {p.isPrimaryGuardian && (
                        <Chip label="Primary" color="primary" size="small" />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Email: {p.isExisting && p.existingParent ? p.existingParent.email : p.email}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Submission CTA */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />}>
          Back
        </Button>
        <Button
          variant="contained"
          color="success"
          size="large"
          onClick={onSubmit}
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <CheckCircleIcon />
            )
          }
        >
          {isSubmitting ? 'Processing Admission...' : 'Confirm & Complete Admission'}
        </Button>
      </Box>
    </Card>
  );
};

