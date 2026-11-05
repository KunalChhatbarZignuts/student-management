'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { Period } from '@/features/timetables/types';
import { SubjectItem } from '@/features/teachers/types';

export interface EditingSlotState {
  day: number;
  period: Period;
  subjectId: string;
  teacherId: string;
  roomNumber: string;
}

export interface CellEditorDialogProps {
  open: boolean;
  onClose: () => void;
  editingSlot: EditingSlotState | null;
  dayLabel?: string;
  subjects?: SubjectItem[];
  teachersData?: any;
  onSave: (slot: EditingSlotState) => void;
  onClear: () => void;
}

export default function CellEditorDialog({
  open,
  onClose,
  editingSlot,
  dayLabel,
  subjects = [],
  teachersData,
  onSave,
  onClear,
}: CellEditorDialogProps) {
  const [localSlot, setLocalSlot] = React.useState<EditingSlotState | null>(editingSlot);

  React.useEffect(() => {
    setLocalSlot(editingSlot);
  }, [editingSlot]);

  if (!localSlot) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Assign {localSlot.period.name || `Period ${localSlot.period.number}`}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {dayLabel} ({localSlot.period.start_time} - {localSlot.period.end_time})
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel id="slot-sub-label">Subject</InputLabel>
            <Select
              labelId="slot-sub-label"
              value={localSlot.subjectId}
              label="Subject"
              onChange={(e) => setLocalSlot({ ...localSlot, subjectId: e.target.value })}
            >
              <MenuItem value="">
                <em>None (Clear Slot)</em>
              </MenuItem>
              {subjects.map((sub) => (
                <MenuItem key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="slot-teacher-label">Teacher</InputLabel>
            <Select
              labelId="slot-teacher-label"
              value={localSlot.teacherId}
              label="Teacher"
              onChange={(e) => setLocalSlot({ ...localSlot, teacherId: e.target.value })}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {(teachersData?.items as any[])?.map((u: any) => {
                const t = u.teacher;
                if (!t) return null;
                return (
                  <MenuItem key={t.id} value={t.id}>
                    {t.first_name} {t.last_name} ({t.employee_code || t.department || 'Staff'})
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <TextField
            label="Room Number"
            size="small"
            fullWidth
            value={localSlot.roomNumber}
            onChange={(e) => setLocalSlot({ ...localSlot, roomNumber: e.target.value })}
            placeholder="e.g. Lab 2, Room 104"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button color="error" onClick={onClear} startIcon={<DeleteOutlineIcon />}>
          Clear Slot
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={() => localSlot && onSave(localSlot)}>
            Save Slot
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

