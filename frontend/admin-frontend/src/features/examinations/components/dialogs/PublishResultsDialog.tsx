import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';

import { Examination, ExaminationSchedule } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  examination: Examination;
  schedules: ExaminationSchedule[];
  onConfirm: (sectionId?: string) => Promise<void>;
  isSubmitting: boolean;
}

export const PublishResultsDialog: React.FC<Props> = ({
  open,
  onClose,
  examination,
  schedules,
  onConfirm,
  isSubmitting,
}) => {
  const [selectedSection, setSelectedSection] = React.useState<string>('ALL');
  const [error, setError] = React.useState<string | null>(null);

  // Extract unique sections
  const uniqueSections = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; gradeName: string }>();
    schedules.forEach((s) => {
      if (s.section_id && !map.has(s.section_id)) {
        map.set(s.section_id, {
          id: s.section_id,
          name: s.section_name || 'Section',
          gradeName: s.grade_name || 'Grade',
        });
      }
    });
    return Array.from(map.values());
  }, [schedules]);

  const handlePublish = async () => {
    setError(null);
    try {
      const secId = selectedSection === 'ALL' ? undefined : selectedSection;
      await onConfirm(secId);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to publish results.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: '#00796b' }}>
        Publish Official Examination Results
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Publishing results makes final marks, percentage, grades, and official PDF report cards
          immediately accessible to students and parents on their respective portals.
        </Typography>

        <Alert severity="warning" sx={{ mb: 3 }}>
          Ensure that assigned Class Teachers have entered and submitted all marks before publishing.
        </Alert>

        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel id="publish-section-label">Scope of Publication</InputLabel>
          <Select
            labelId="publish-section-label"
            label="Scope of Publication"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <MenuItem value="ALL">
              <strong>All Sections ({uniqueSections.length} sections)</strong>
            </MenuItem>
            {uniqueSections.map((sec) => (
              <MenuItem key={sec.id} value={sec.id}>
                {sec.gradeName} - {sec.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handlePublish}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          Publish Results Now
        </Button>
      </DialogActions>
    </Dialog>
  );
};

