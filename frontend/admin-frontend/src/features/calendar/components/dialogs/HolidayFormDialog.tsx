import * as React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { WarningAmber } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { SchoolHoliday, HolidayCategory } from '@/features/calendar/types';

export interface HolidayFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingHoliday: SchoolHoliday | null;
  holidayName: string;
  onHolidayNameChange: (val: string) => void;
  holidayCategoryId: string;
  onHolidayCategoryIdChange: (val: string) => void;
  categories: HolidayCategory[];
  holidayStartDate: string;
  onHolidayStartDateChange: (val: string) => void;
  holidayEndDate: string;
  onHolidayEndDateChange: (val: string) => void;
  holidayDescription: string;
  onHolidayDescriptionChange: (val: string) => void;
  isSchoolWide: boolean;
  onIsSchoolWideChange: (val: boolean) => void;
  selectedGradeIds: string[];
  onToggleGradeId: (id: string, checked: boolean) => void;
  grades: { id: string; name: string }[];
  conflictWarning: string | null;
  onSave: (forceOverride?: boolean) => void;
  isSaving: boolean;
}

export const HolidayFormDialog: React.FC<HolidayFormDialogProps> = ({
  open,
  onClose,
  editingHoliday,
  holidayName,
  onHolidayNameChange,
  holidayCategoryId,
  onHolidayCategoryIdChange,
  categories,
  holidayStartDate,
  onHolidayStartDateChange,
  holidayEndDate,
  onHolidayEndDateChange,
  holidayDescription,
  onHolidayDescriptionChange,
  isSchoolWide,
  onIsSchoolWideChange,
  selectedGradeIds,
  onToggleGradeId,
  grades,
  conflictWarning,
  onSave,
  isSaving,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {editingHoliday ? 'Edit School Holiday' : 'Create School Holiday'}
      </DialogTitle>
      <DialogContent dividers>
        {conflictWarning && (
          <Alert
            severity="warning"
            icon={<WarningAmber />}
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => onSave(true)}>
                Override & Save
              </Button>
            }
          >
            {conflictWarning}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Holiday / Vacation Name"
              placeholder="e.g. Diwali Vacation, Republic Day"
              value={holidayName}
              onChange={(e) => onHolidayNameChange(e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={holidayCategoryId}
                label="Category"
                onChange={(e) => onHolidayCategoryIdChange(e.target.value)}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Start Date"
              value={holidayStartDate ? dayjs(holidayStartDate) : null}
              onChange={(newVal) =>
                onHolidayStartDateChange(newVal ? newVal.format('YYYY-MM-DD') : '')
              }
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="End Date"
              value={holidayEndDate ? dayjs(holidayEndDate) : null}
              onChange={(newVal) =>
                onHolidayEndDateChange(newVal ? newVal.format('YYYY-MM-DD') : '')
              }
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description / Circular Ref"
              placeholder="Brief reason or circular details..."
              multiline
              rows={2}
              value={holidayDescription}
              onChange={(e) => onHolidayDescriptionChange(e.target.value)}
            />
          </Grid>

          {/* Scope selection */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Applicability Scope
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isSchoolWide}
                  onChange={(e) => onIsSchoolWideChange(e.target.checked)}
                />
              }
              label="School-Wide (Applies to all grades & sections)"
            />

            {!isSchoolWide && (
              <Box sx={{ mt: 1, pl: 2, borderLeft: '2px solid #e0e0e0' }}>
                <Typography variant="caption" color="text.secondary">
                  Select specific grades this holiday applies to:
                </Typography>
                <FormGroup row sx={{ mt: 1 }}>
                  {grades.map((g) => (
                    <FormControlLabel
                      key={g.id}
                      control={
                        <Checkbox
                          checked={selectedGradeIds.includes(g.id)}
                          onChange={(e) => onToggleGradeId(g.id, e.target.checked)}
                        />
                      }
                      label={g.name}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => onSave(false)}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Holiday'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

