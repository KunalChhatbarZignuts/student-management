import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import PersonIcon from '@mui/icons-material/Person';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import AppDatePicker from '@/components/ui/AppDatePicker';
import { StudentFormData } from '@/features/admissions/types';

export interface StudentPersonalStepProps {
  studentData: StudentFormData;
  onUpdate: (updates: Partial<StudentFormData>) => void;
  onNext: () => void;
}

export const StudentPersonalStep: React.FC<StudentPersonalStepProps> = ({
  studentData,
  onUpdate,
  onNext,
}) => {
  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <PersonIcon color="primary" sx={{ fontSize: 28 }} />
        <Typography variant="h6" fontWeight={700}>
          Step 1: Student Personal Information
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="First Name"
            required
            fullWidth
            value={studentData.firstName}
            onChange={(e) => onUpdate({ firstName: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Middle Name"
            fullWidth
            value={studentData.middleName}
            onChange={(e) => onUpdate({ middleName: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Last Name"
            required
            fullWidth
            value={studentData.lastName}
            onChange={(e) => onUpdate({ lastName: e.target.value })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <AppDatePicker
            label="Date of Birth"
            required
            value={studentData.dob}
            onChange={(val) => onUpdate({ dob: val })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Gender</InputLabel>
            <Select
              label="Gender"
              value={studentData.gender}
              onChange={(e) => onUpdate({ gender: e.target.value })}
            >
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Student Email (Optional)"
            type="email"
            fullWidth
            placeholder="student@school.edu"
            helperText="If omitted, an institutional login identifier will be automatically generated."
            value={studentData.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Phone Number"
            fullWidth
            placeholder="+1 555-0100"
            value={studentData.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Alternate Phone"
            fullWidth
            value={studentData.alternatePhone}
            onChange={(e) => onUpdate({ alternatePhone: e.target.value })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Department / Stream</InputLabel>
            <Select
              label="Department / Stream"
              value={studentData.department || 'General'}
              onChange={(e) => onUpdate({ department: e.target.value })}
            >
              <MenuItem value="General">General</MenuItem>
              <MenuItem value="Science">Science</MenuItem>
              <MenuItem value="Commerce">Commerce</MenuItem>
              <MenuItem value="Arts">Arts</MenuItem>
              <MenuItem value="Humanities">Humanities</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Chip label="Address & Location" size="small" />
          </Divider>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Street Address"
            fullWidth
            value={studentData.address}
            onChange={(e) => onUpdate({ address: e.target.value })}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <TextField
            label="City"
            fullWidth
            value={studentData.city}
            onChange={(e) => onUpdate({ city: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="State / Province"
            fullWidth
            value={studentData.state}
            onChange={(e) => onUpdate({ state: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Country"
            fullWidth
            value={studentData.country}
            onChange={(e) => onUpdate({ country: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Postal Code"
            fullWidth
            value={studentData.postalCode}
            onChange={(e) => onUpdate({ postalCode: e.target.value })}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Chip label="Previous Academic Background" size="small" />
          </Divider>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Previous School Name"
            fullWidth
            placeholder="e.g. St. Mary's Elementary"
            value={studentData.previousSchoolName}
            onChange={(e) => onUpdate({ previousSchoolName: e.target.value })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Previous School Details / Remarks"
            fullWidth
            placeholder="Grades attended, transfer certificate info..."
            value={studentData.previousSchoolDetails}
            onChange={(e) => onUpdate({ previousSchoolDetails: e.target.value })}
          />
        </Grid>
      </Grid>

      {/* Step Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onNext}
          endIcon={<ArrowForwardIcon />}
        >
          Continue to Parent Details
        </Button>
      </Box>
    </Card>
  );
};

