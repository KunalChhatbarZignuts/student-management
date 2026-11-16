'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { AcademicYear, Grade, Section } from '@/features/grades/types';
import { Shift } from '@/features/timetables/types';

export interface TimetableFilterBarProps {
  academicYears?: AcademicYear[];
  selectedAcademicYearId: string;
  onAcademicYearChange: (val: string) => void;
  grades?: Grade[];
  selectedGradeId: string;
  onGradeChange: (val: string) => void;
  sections?: Section[];
  selectedSectionId: string;
  onSectionChange: (val: string) => void;
  shiftsList?: Shift[];
  currentGradeShiftId?: string | null;
  onAssignShift: (shiftId: string | null) => void;
  isAssigningShift: boolean;
}

export default function TimetableFilterBar({
  academicYears = [],
  selectedAcademicYearId,
  onAcademicYearChange,
  grades = [],
  selectedGradeId,
  onGradeChange,
  sections = [],
  selectedSectionId,
  onSectionChange,
  shiftsList = [],
  currentGradeShiftId,
  onAssignShift,
  isAssigningShift,
}: TimetableFilterBarProps) {
  return (
    <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="ay-label">Academic Year</InputLabel>
            <Select
              labelId="ay-label"
              value={selectedAcademicYearId}
              label="Academic Year"
              onChange={(e) => onAcademicYearChange(e.target.value)}
            >
              {academicYears.map((ay) => (
                <MenuItem key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? '(Current)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="grade-label">Grade</InputLabel>
            <Select
              labelId="grade-label"
              value={selectedGradeId}
              label="Grade"
              onChange={(e) => onGradeChange(e.target.value)}
            >
              {grades.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="sec-label">Section</InputLabel>
            <Select
              labelId="sec-label"
              value={selectedSectionId}
              label="Section"
              onChange={(e) => onSectionChange(e.target.value)}
            >
              {sections.map((sec) => (
                <MenuItem key={sec.id} value={sec.id}>
                  {sec.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="shift-assign-label">Assigned Shift</InputLabel>
            <Select
              labelId="shift-assign-label"
              value={currentGradeShiftId || ''}
              label="Assigned Shift"
              disabled={isAssigningShift || !selectedGradeId}
              onChange={(e) => {
                const shiftId = e.target.value || null;
                if (selectedGradeId) {
                  onAssignShift(shiftId);
                }
              }}
            >
              <MenuItem value="">
                <em>None (Unassigned)</em>
              </MenuItem>
              {shiftsList.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.start_time} - {s.end_time})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );
}

