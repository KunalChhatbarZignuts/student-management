'use client';

import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { EnrolledStudentItem, Section } from '@/features/grades/types';

export const transferSchema = z.object({
  target_section_id: z.string().min(1, 'Target section is required'),
  reason: z.string().max(255).optional().or(z.literal('')),
});

export type TransferFormData = z.infer<typeof transferSchema>;

export interface StudentSectionTransferDialogProps {
  student: EnrolledStudentItem | null;
  onClose: () => void;
  onSubmit: (data: TransferFormData) => void;
  isSubmitting: boolean;
  sections: Section[];
  currentSectionId?: string;
}

export default function StudentSectionTransferDialog({
  student,
  onClose,
  onSubmit,
  isSubmitting,
  sections = [],
  currentSectionId,
}: StudentSectionTransferDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
  });

  React.useEffect(() => {
    if (student) {
      reset({
        target_section_id: '',
        reason: '',
      });
    }
  }, [student, reset]);

  if (!student) return null;

  return (
    <Dialog
      open={Boolean(student)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle fontWeight={700}>
        Transfer {student.first_name} {student.last_name}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <TextField
            fullWidth
            select
            label="Target Section *"
            defaultValue=""
            error={!!errors.target_section_id}
            helperText={errors.target_section_id?.message}
            {...register('target_section_id')}
            sx={{ mb: 2, mt: 1 }}
          >
            <MenuItem value="" disabled>
              Select target section...
            </MenuItem>
            {sections
              .filter((sec) => sec.id !== currentSectionId)
              .map((sec) => (
                <MenuItem key={sec.id} value={sec.id}>
                  Section {sec.name} ({sec.total_students || 0}/{sec.class_capacity || 30})
                </MenuItem>
              ))}
          </TextField>

          <TextField
            fullWidth
            label="Reason for Transfer (Optional)"
            multiline
            rows={2}
            placeholder="e.g. Balancing classroom size, student request..."
            {...register('reason')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isSubmitting ? 'Transferring...' : 'Execute Transfer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

