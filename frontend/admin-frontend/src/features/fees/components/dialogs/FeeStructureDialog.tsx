'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Paper from '@mui/material/Paper';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import { AcademicYear, Grade } from '@/features/grades/types';
import { FeeComponent } from '@/features/fees/api';

export interface FeeStructureFormState {
  name: string;
  academicYearId: string;
  gradeId: string;
  effectiveDate: string;
  items: { feeComponentId: string; amount: number; paymentFrequency: string; isMandatory: boolean }[];
}

export interface FeeStructureDialogProps {
  open: boolean;
  onClose: () => void;
  form: FeeStructureFormState;
  onChangeForm: (form: FeeStructureFormState) => void;
  academicYears: AcademicYear[];
  grades: Grade[];
  components: FeeComponent[];
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function FeeStructureDialog({
  open,
  onClose,
  form,
  onChangeForm,
  academicYears,
  grades,
  components,
  onSubmit,
  isSubmitting,
}: FeeStructureDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configure Grade Fee Structure</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Structure Name"
              required
              fullWidth
              placeholder="e.g. Grade 2 Standard Fee Plan 2026-27"
              value={form.name}
              onChange={(e) => onChangeForm({ ...form, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth required>
              <InputLabel>Academic Year</InputLabel>
              <Select
                label="Academic Year"
                value={form.academicYearId}
                onChange={(e) => onChangeForm({ ...form, academicYearId: e.target.value })}
              >
                {academicYears.map((ay) => (
                  <MenuItem key={ay.id} value={ay.id}>
                    {ay.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth required>
              <InputLabel>Grade</InputLabel>
              <Select
                label="Grade"
                value={form.gradeId}
                onChange={(e) => onChangeForm({ ...form, gradeId: e.target.value })}
              >
                {grades.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Itemized Fee Components & Amounts
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell>Amount (₹)</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Mandatory?</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {form.items.map((item, index) => {
                    const comp = components.find((c) => c.id === item.feeComponentId);
                    return (
                      <TableRow key={item.feeComponentId}>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {comp?.name || 'Component'} ({comp?.code})
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.amount}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...form.items];
                              updated[index].amount = val;
                              onChangeForm({ ...form, items: updated });
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                            }}
                            sx={{ width: 140 }}
                          />
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{item.paymentFrequency}</TableCell>
                        <TableCell>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={item.isMandatory}
                                onChange={(e) => {
                                  const updated = [...form.items];
                                  updated[index].isMandatory = e.target.checked;
                                  onChangeForm({ ...form, items: updated });
                                }}
                              />
                            }
                            label={item.isMandatory ? 'Mandatory' : 'Optional'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Fee Structure'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

