'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import { ParentProfileUpdate } from '@/features/parents/types';

interface EditParentProfileDialogProps {
  open: boolean;
  onClose: () => void;
  email?: string;
  initialValues: ParentProfileUpdate;
  onSave: (data: ParentProfileUpdate) => Promise<void>;
  isSaving: boolean;
}

export const EditParentProfileDialog: React.FC<EditParentProfileDialogProps> = ({
  open,
  onClose,
  email,
  initialValues,
  onSave,
  isSaving,
}) => {
  const [form, setForm] = React.useState<ParentProfileUpdate>(initialValues);

  React.useEffect(() => {
    if (open) {
      setForm(initialValues);
    }
  }, [open, initialValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth component="form" onSubmit={handleSubmit}>
      <DialogTitle fontWeight={700}>Update Guardian Profile</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Registered Email"
            value={email || ''}
            disabled
            helperText="Email address cannot be modified directly"
            fullWidth
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="First Name"
              required
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Last Name"
              required
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              fullWidth
            />
          </Box>
          <TextField
            label="Contact Phone"
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 555-0199"
            fullWidth
          />
          <TextField
            label="Residential Address"
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="123 Maple Street, City, State"
            multiline
            rows={2}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSaving || !form.first_name.trim() || !form.last_name.trim()}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

