'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import CircularProgress from '@mui/material/CircularProgress';

import { ParentWithChildren } from '@/features/parents/api';

export interface LinkChildDialogProps {
  linkingParent: ParentWithChildren | null;
  onClose: () => void;
  onSubmit: (data: {
    studentId: string;
    relationshipType: string;
    isPrimaryGuardian: boolean;
  }) => void;
  isSubmitting: boolean;
  studentOptions: { id: string; label: string }[];
  isLoadingStudents: boolean;
}

export default function LinkChildDialog({
  linkingParent,
  onClose,
  onSubmit,
  isSubmitting,
  studentOptions,
  isLoadingStudents,
}: LinkChildDialogProps) {
  const [selectedStudent, setSelectedStudent] = React.useState<{ id: string; label: string } | null>(null);
  const [relationshipType, setRelationshipType] = React.useState('Guardian');
  const [isPrimaryGuardian, setIsPrimaryGuardian] = React.useState(false);

  React.useEffect(() => {
    if (!linkingParent) {
      setSelectedStudent(null);
      setRelationshipType('Guardian');
      setIsPrimaryGuardian(false);
    }
  }, [linkingParent]);

  if (!linkingParent) return null;

  const handleLink = () => {
    if (!selectedStudent) return;
    onSubmit({
      studentId: selectedStudent.id,
      relationshipType,
      isPrimaryGuardian,
    });
  };

  return (
    <Dialog open={Boolean(linkingParent)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>
        Link Student to Parent Account
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Alert severity="info">
            Linking to: <strong>{linkingParent.first_name} {linkingParent.last_name}</strong> ({linkingParent.email})
          </Alert>

          {studentOptions.length === 0 && !isLoadingStudents ? (
            <Alert severity="warning">
              All enrolled students currently have an active parent profile. Each student can be linked to only one parent profile. To link a student here, unlink them from their existing parent first.
            </Alert>
          ) : (
            <>
              <Autocomplete
                options={studentOptions}
                getOptionLabel={(opt) => opt.label}
                value={selectedStudent}
                loading={isLoadingStudents}
                onChange={(_, val) => setSelectedStudent(val)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Enrolled Student *"
                    placeholder="Type student name or ID..."
                    helperText="Only displaying unlinked students (1 parent profile per student rule)."
                  />
                )}
              />

              <TextField
                select
                fullWidth
                label="Relationship Type *"
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
              >
                <MenuItem value="Father">Father</MenuItem>
                <MenuItem value="Mother">Mother</MenuItem>
                <MenuItem value="Guardian">Legal Guardian</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>

              <FormControlLabel
                control={
                  <Switch
                    checked={isPrimaryGuardian}
                    onChange={(e) => setIsPrimaryGuardian(e.target.checked)}
                    color="primary"
                  />
                }
                label="Designate as Primary Guardian (Syncs contact info to student profile)"
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!selectedStudent || isSubmitting}
          onClick={handleLink}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? 'Linking...' : 'Link Student'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

