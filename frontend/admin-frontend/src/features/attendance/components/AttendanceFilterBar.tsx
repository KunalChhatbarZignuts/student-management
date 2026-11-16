'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';

import AppDatePicker from '@/components/ui/AppDatePicker';
import { AssignedSectionItem, AttendanceStatusType } from '@/features/attendance/types';

export interface AdminSectionOption {
  id: string;
  name: string;
  gradeName: string;
  gradeId: string;
}

export interface AttendanceFilterBarProps {
  isTeacher: boolean;
  selectedSectionId: string;
  onSectionChange: (val: string) => void;
  teacherSections?: AssignedSectionItem[];
  adminSections: AdminSectionOption[];
  loadingTeacherSections: boolean;
  selectedDate: string;
  onDateChange: (val: string) => void;
  todayStr: string;
  isNonWorkingDay: boolean;
  onMarkAll: (status: AttendanceStatusType) => void;
}

export function AttendanceFilterBar({
  isTeacher,
  selectedSectionId,
  onSectionChange,
  teacherSections,
  adminSections,
  loadingTeacherSections,
  selectedDate,
  onDateChange,
  todayStr,
  isNonWorkingDay,
  onMarkAll,
}: AttendanceFilterBarProps) {
  return (
    <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={5}>
          <FormControl fullWidth size="small">
            <InputLabel id="assigned-section-select-label">
              {isTeacher ? 'My Assigned Section' : 'Select Grade & Section'}
            </InputLabel>
            <Select
              labelId="assigned-section-select-label"
              value={selectedSectionId}
              label={isTeacher ? 'My Assigned Section' : 'Select Grade & Section'}
              onChange={(e) => onSectionChange(e.target.value)}
              disabled={isTeacher ? loadingTeacherSections : false}
            >
              {isTeacher
                ? teacherSections?.map((s) => (
                    <MenuItem key={s.section_id} value={s.section_id}>
                      {s.grade_name} – Section {s.section_name} ({s.role || 'Teacher'}) [{s.enrolled_students_count} Students]
                    </MenuItem>
                  ))
                : adminSections.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <AppDatePicker
            size="small"
            label="Attendance Date"
            value={selectedDate}
            onChange={onDateChange}
            maxDate={todayStr}
          />
        </Grid>

        <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            color="success"
            fullWidth
            disabled={isNonWorkingDay}
            onClick={() => onMarkAll('PRESENT')}
          >
            All Present
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            fullWidth
            disabled={isNonWorkingDay}
            onClick={() => onMarkAll('ABSENT')}
          >
            All Absent
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}
