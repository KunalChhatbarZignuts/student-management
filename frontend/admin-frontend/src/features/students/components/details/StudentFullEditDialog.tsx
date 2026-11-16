'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';

import AppDatePicker from '@/components/ui/AppDatePicker';

export interface StudentFullEditDialogProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  studentCode: string;
  editFormData: any;
  setEditFormData: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  academicYears: any[];
  gradesList: any[];
  sectionsList: any[];
}

export default function StudentFullEditDialog({
  open,
  onClose,
  studentName,
  studentCode,
  editFormData,
  setEditFormData,
  onSubmit,
  isSubmitting,
  academicYears,
  gradesList,
  sectionsList,
}: StudentFullEditDialogProps) {
  const [editTab, setEditTab] = React.useState(0);

  return (
    <Dialog
      open={open}
      onClose={() => !isSubmitting && onClose()}
      maxWidth="md"
      fullWidth
    >
      <form onSubmit={onSubmit}>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            Edit Student Profile: {studentName} ({studentCode})
          </Typography>
          <Button
            size="small"
            onClick={onClose}
            disabled={isSubmitting}
            sx={{ minWidth: 'auto', p: 0.5 }}
          >
            <CloseIcon />
          </Button>
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs
            value={editTab}
            onChange={(_, v) => setEditTab(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Personal Details" />
            <Tab label="Address & Contact" />
            <Tab label="Prior Education" />
            <Tab label="Medical & Emergency" />
            <Tab label="Academic Transfer" />
          </Tabs>
        </Box>

        <DialogContent dividers sx={{ p: 3 }}>
          {/* EDIT TAB 0: PERSONAL DETAILS */}
          {editTab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="First Name"
                  required
                  fullWidth
                  value={editFormData.first_name}
                  onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Middle Name"
                  fullWidth
                  value={editFormData.middle_name}
                  onChange={(e) => setEditFormData({ ...editFormData, middle_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Last Name"
                  required
                  fullWidth
                  value={editFormData.last_name}
                  onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <AppDatePicker
                  label="Date of Birth"
                  required
                  value={editFormData.dob}
                  onChange={(val) => setEditFormData({ ...editFormData, dob: val })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    label="Gender"
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Department / Stream</InputLabel>
                  <Select
                    label="Department / Stream"
                    value={editFormData.department || 'General'}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  >
                    <MenuItem value="General">General</MenuItem>
                    <MenuItem value="Science">Science</MenuItem>
                    <MenuItem value="Commerce">Commerce</MenuItem>
                    <MenuItem value="Arts">Arts</MenuItem>
                    <MenuItem value="Humanities">Humanities</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Student Status</InputLabel>
                  <Select
                    label="Student Status"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="transferred">Transferred</MenuItem>
                    <MenuItem value="withdrawn">Withdrawn</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}

          {/* EDIT TAB 1: ADDRESS & CONTACT */}
          {editTab === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Primary Phone"
                  fullWidth
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Alternate Phone"
                  fullWidth
                  value={editFormData.alternate_phone}
                  onChange={(e) => setEditFormData({ ...editFormData, alternate_phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Street Address"
                  fullWidth
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="City"
                  fullWidth
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="State / Province"
                  fullWidth
                  value={editFormData.state}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Country"
                  fullWidth
                  value={editFormData.country}
                  onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Postal Code"
                  fullWidth
                  value={editFormData.postal_code}
                  onChange={(e) => setEditFormData({ ...editFormData, postal_code: e.target.value })}
                />
              </Grid>
            </Grid>
          )}

          {/* EDIT TAB 2: PRIOR EDUCATION */}
          {editTab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Previous School Name"
                  fullWidth
                  value={editFormData.previous_school_name}
                  onChange={(e) => setEditFormData({ ...editFormData, previous_school_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Previous School Details / Transfer Notes"
                  fullWidth
                  multiline
                  rows={4}
                  value={editFormData.previous_school_details}
                  onChange={(e) => setEditFormData({ ...editFormData, previous_school_details: e.target.value })}
                />
              </Grid>
            </Grid>
          )}

          {/* EDIT TAB 3: MEDICAL & EMERGENCY */}
          {editTab === 3 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Manage the student's medical alerts, blood group, emergency hotline, and authorized dismissal/pickup contacts.
                </Alert>
              </Grid>

              {/* Blood Group */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Blood Group</InputLabel>
                  <Select
                    label="Blood Group"
                    value={editFormData.blood_group || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, blood_group: e.target.value })}
                  >
                    <MenuItem value="">Not Specified</MenuItem>
                    <MenuItem value="A+">A+</MenuItem>
                    <MenuItem value="A-">A-</MenuItem>
                    <MenuItem value="B+">B+</MenuItem>
                    <MenuItem value="B-">B-</MenuItem>
                    <MenuItem value="AB+">AB+</MenuItem>
                    <MenuItem value="AB-">AB-</MenuItem>
                    <MenuItem value="O+">O+</MenuItem>
                    <MenuItem value="O-">O-</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Emergency Contact Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Emergency Contact Name"
                  fullWidth
                  placeholder="e.g. Mary Babbage (Mother)"
                  value={editFormData.emergency_contact_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_name: e.target.value })}
                />
              </Grid>

              {/* Emergency Contact Phone */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Emergency Phone / Hotline"
                  fullWidth
                  placeholder="+1-555-0199"
                  value={editFormData.emergency_contact_phone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_phone: e.target.value })}
                />
              </Grid>

              {/* Guardian Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Primary Guardian Name"
                  fullWidth
                  value={editFormData.guardian_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, guardian_name: e.target.value })}
                />
              </Grid>

              {/* Guardian Phone & Email */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Guardian Phone"
                  fullWidth
                  value={editFormData.guardian_phone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, guardian_phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Guardian Email"
                  type="email"
                  fullWidth
                  value={editFormData.guardian_email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, guardian_email: e.target.value })}
                />
              </Grid>

              {/* Known Allergies */}
              <Grid item xs={12}>
                <TextField
                  label="Documented Allergies"
                  fullWidth
                  placeholder="e.g. Peanuts, Penicillin, Bee stings (Leave blank if none)"
                  value={editFormData.allergies || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
                  helperText="High-priority alert displayed to teachers, school clinic, and staff."
                />
              </Grid>

              {/* Medical Conditions */}
              <Grid item xs={12}>
                <TextField
                  label="Medical Conditions / Special Instructions"
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="e.g. Mild asthma, carries inhaler; requires glucose check before sports"
                  value={editFormData.medical_conditions || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, medical_conditions: e.target.value })}
                />
              </Grid>

              {/* Authorized Pickup List */}
              <Grid item xs={12}>
                <TextField
                  label="Authorized Dismissal & Pickup Registry"
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="e.g. Parents (Mary & John), Grandfather (Robert Lovelace with ID)"
                  value={editFormData.authorized_pickup_info || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, authorized_pickup_info: e.target.value })}
                  helperText="List of individuals authorized to pick up student at school dismissal."
                />
              </Grid>
            </Grid>
          )}

          {/* EDIT TAB 4: ACADEMIC TRANSFER */}
          {editTab === 4 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Only select a target section if transferring the student to a new section. A new academic enrollment record will be created preserving the student's historical progression.
                </Alert>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Academic Year</InputLabel>
                  <Select
                    label="Academic Year"
                    value={editFormData.target_academic_year_id}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        target_academic_year_id: e.target.value,
                        target_grade_id: '',
                        target_section_id: '',
                      })
                    }
                  >
                    <MenuItem value="">
                      <em>None (Keep Current)</em>
                    </MenuItem>
                    {academicYears.map((ay: any) => (
                      <MenuItem key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_current ? '(Current)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth disabled={!editFormData.target_academic_year_id}>
                  <InputLabel>Target Grade</InputLabel>
                  <Select
                    label="Target Grade"
                    value={editFormData.target_grade_id}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        target_grade_id: e.target.value,
                        target_section_id: '',
                      })
                    }
                  >
                    <MenuItem value="">
                      <em>Select Grade</em>
                    </MenuItem>
                    {gradesList.map((g: any) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth disabled={!editFormData.target_grade_id}>
                  <InputLabel>Target Section</InputLabel>
                  <Select
                    label="Target Section"
                    value={editFormData.target_section_id}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        target_section_id: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="">
                      <em>Select Section</em>
                    </MenuItem>
                    {sectionsList.map((s: any) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {editFormData.target_section_id && (
                <Grid item xs={12}>
                  <TextField
                    label="Transfer Reason"
                    required
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Reason for section reassignment..."
                    value={editFormData.transfer_reason}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        transfer_reason: e.target.value,
                      })
                    }
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

