import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';

import AppDatePicker from '@/components/ui/AppDatePicker';
import {
  AdminAttendanceOverviewResponse,
  SectionDailyOverviewItem,
} from '@/features/attendance/types';

export interface AttendanceAdminOverviewProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedGradeId: string;
  onGradeChange: (gradeId: string) => void;
  grades: { id: string; name: string }[];
  overviewStatusFilter: string;
  onOverviewStatusFilterChange: (status: string) => void;
  searchSectionQuery: string;
  onSearchSectionQueryChange: (query: string) => void;
  loadingOverview: boolean;
  overviewData?: AdminAttendanceOverviewResponse | null;
  filteredSections: SectionDailyOverviewItem[];
  onSelectSection: (sectionId: string) => void;
}

export const AttendanceAdminOverview: React.FC<AttendanceAdminOverviewProps> = ({
  selectedDate,
  onDateChange,
  selectedGradeId,
  onGradeChange,
  grades,
  overviewStatusFilter,
  onOverviewStatusFilterChange,
  searchSectionQuery,
  onSearchSectionQueryChange,
  loadingOverview,
  overviewData,
  filteredSections,
  onSelectSection,
}) => {
  return (
    <Box>
      {/* Filter controls */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <AppDatePicker
              size="small"
              label="Select Overview Date"
              value={selectedDate}
              onChange={onDateChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="grade-filter-label">Filter by Grade</InputLabel>
              <Select
                labelId="grade-filter-label"
                value={selectedGradeId}
                label="Filter by Grade"
                onChange={(e) => onGradeChange(e.target.value)}
              >
                <MenuItem value="">All Grades</MenuItem>
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
              <InputLabel id="status-filter-label">Attendance Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={overviewStatusFilter}
                label="Attendance Status"
                onChange={(e) => onOverviewStatusFilterChange(e.target.value)}
              >
                <MenuItem value="ALL">All Sections (Marked & Unmarked)</MenuItem>
                <MenuItem value="Marked">Marked Only</MenuItem>
                <MenuItem value="Unmarked">Unmarked Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search section or grade..."
              value={searchSectionQuery}
              onChange={(e) => onSearchSectionQueryChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {loadingOverview ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !overviewData ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="body1" color="text.secondary">
            No overview data available.
          </Typography>
        </Paper>
      ) : (
        <Box>
          {/* Overview Metric Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Sections
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {overviewData.total_sections}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2, bgcolor: 'primary.50' }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="primary.dark">
                    Marked Sections
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {overviewData.marked_sections} / {overviewData.total_sections}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">
                    Enrolled Students
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {overviewData.total_students}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2, bgcolor: 'success.50' }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="success.dark">
                    Present
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    {overviewData.total_present}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card sx={{ borderRadius: 2, bgcolor: 'error.50' }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="error.dark">
                    Absent
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="error.main">
                    {overviewData.total_absent}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <Card sx={{ borderRadius: 2, bgcolor: 'info.50' }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="info.dark">
                    Overall Attendance %
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="info.main">
                    {overviewData.overall_percentage}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Section-Wise Status Table */}
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>
                      <strong>Grade & Section</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Status</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Students</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Present</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Absent</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Late</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Excused</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Attendance %</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Marked By</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Action</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No sections match the selected filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSections.map((item) => (
                      <TableRow key={item.section_id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {item.grade_name} – Section {item.section_name}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.status}
                            size="small"
                            color={item.status === 'Marked' ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell align="center">{item.total_students}</TableCell>
                        <TableCell align="center" sx={{ color: 'success.main', fontWeight: 600 }}>
                          {item.present}
                        </TableCell>
                        <TableCell align="center" sx={{ color: item.absent > 0 ? 'error.main' : 'inherit' }}>
                          {item.absent}
                        </TableCell>
                        <TableCell align="center">{item.late}</TableCell>
                        <TableCell align="center">{item.excused}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${item.attendance_percentage}%`}
                            size="small"
                            variant="outlined"
                            color={
                              item.attendance_percentage >= 80
                                ? 'success'
                                : item.attendance_percentage >= 60
                                ? 'warning'
                                : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{item.marked_by || '—'}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => onSelectSection(item.section_id)}
                          >
                            {item.status === 'Marked' ? 'View / Edit' : 'Take Attendance'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

