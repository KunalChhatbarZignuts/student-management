'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Radio,
  TextField,
  Alert,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BlockIcon from '@mui/icons-material/Block';
import { AffectedTimetableSlot, SubstituteCandidate } from '../types';
import { substitutionApi } from '../api';

interface AssignSubstituteModalProps {
  open: boolean;
  slot: AffectedTimetableSlot | null;
  date: string;
  onClose: () => void;
  onAssigned: () => void;
}

export const AssignSubstituteModal: React.FC<AssignSubstituteModalProps> = ({
  open,
  slot,
  date,
  onClose,
  onAssigned,
}) => {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<SubstituteCandidate[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('Teacher absence coverage');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && slot) {
      setLoading(true);
      setError(null);
      setSelectedTeacherId('');
      setNotes('');
      substitutionApi
        .getRecommendations(slot.timetable_entry_id, date)
        .then((res) => {
          setCandidates(res);
          // Auto-select the first available candidate
          const firstAvailable = res.find((c) => c.is_available);
          if (firstAvailable) {
            setSelectedTeacherId(firstAvailable.teacher_id);
          }
        })
        .catch((err) => {
          setError(err?.response?.data?.detail || 'Failed to load substitute recommendations');
        })
        .finally(() => setLoading(false));
    }
  }, [open, slot, date]);

  const handleAssign = async () => {
    if (!slot || !selectedTeacherId) return;
    setSubmitting(true);
    setError(null);
    try {
      await substitutionApi.assignSubstitution({
        date,
        timetable_entry_id: slot.timetable_entry_id,
        substitute_teacher_id: selectedTeacherId,
        reason,
        notes: notes.trim() || undefined,
      });
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to assign substitute teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCandidate = candidates.find((c) => c.teacher_id === selectedTeacherId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Assign Substitute Teacher
      </DialogTitle>
      <DialogContent dividers>
        {slot && (
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              bgcolor: 'primary.50',
              border: '1px solid',
              borderColor: 'primary.200',
            }}
          >
            <Typography variant="subtitle2" color="primary.main" fontWeight={700}>
              AFFECTED CLASS SCHEDULE
            </Typography>
            <Typography variant="body1" fontWeight={600} sx={{ mt: 0.5 }}>
              {slot.period_name} ({slot.start_time} - {slot.end_time}) • {slot.grade_name} - {slot.section_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Subject: <b>{slot.subject_name || 'General'}</b> • Absent Teacher: <b>{slot.original_teacher_name}</b> • Date: <b>{date}</b>
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              Recommended Substitute Candidates
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ranked automatically by subject specialization and lightest daily workload.
            </Typography>

            <List disablePadding sx={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 2 }}>
              {candidates.map((c, index) => {
                const isSelected = selectedTeacherId === c.teacher_id;
                return (
                  <React.Fragment key={c.teacher_id}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <ListItemButton
                        disabled={!c.is_available}
                        onClick={() => c.is_available && setSelectedTeacherId(c.teacher_id)}
                        sx={{
                          bgcolor: isSelected ? 'action.selected' : 'inherit',
                          opacity: c.is_available ? 1 : 0.6,
                        }}
                      >
                        <Radio
                          checked={isSelected}
                          disabled={!c.is_available}
                          value={c.teacher_id}
                          sx={{ mr: 1 }}
                        />
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" fontWeight={600}>
                                {c.teacher_name} ({c.employee_code})
                              </Typography>
                              {c.is_subject_match ? (
                                <Chip
                                  size="small"
                                  color="success"
                                  label="Subject Match"
                                  icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                />
                              ) : c.is_department_match ? (
                                <Chip size="small" color="primary" label={c.department} variant="outlined" />
                              ) : (
                                <Chip size="small" color="default" label={c.department} variant="outlined" />
                              )}
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${c.daily_assigned_periods_count} periods today`}
                                sx={{ fontSize: '0.75rem' }}
                              />
                            </Box>
                          }
                          secondary={
                            !c.is_available ? (
                              <Typography variant="caption" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <BlockIcon fontSize="inherit" /> {c.availability_conflict_reason || 'Unavailable'}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                Available for Period {slot?.period_number} • Department: {c.department}
                              </Typography>
                            )
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  </React.Fragment>
                );
              })}
              {candidates.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No eligible substitute teachers found for this timetable period.
                  </Typography>
                </Box>
              )}
            </List>

            {selectedCandidate && !selectedCandidate.is_subject_match && (
              <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 2 }}>
                Notice: <b>{selectedCandidate.teacher_name}</b> teaches in <b>{selectedCandidate.department}</b>, which does not match <b>{slot?.subject_name}</b>. Ensure appropriate classroom coverage instructions are provided.
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Coverage Reason"
                size="small"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                fullWidth
              />
              <TextField
                label="Instructions / Class Notes (Optional)"
                size="small"
                multiline
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Complete Exercise 4.2 in textbook or conduct revision worksheet."
                fullWidth
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={!selectedTeacherId || submitting}
          startIcon={submitting ? <CircularProgress size={16} /> : undefined}
        >
          {submitting ? 'Assigning...' : 'Confirm Substitution'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
