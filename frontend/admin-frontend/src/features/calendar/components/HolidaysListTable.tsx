import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { EventBusy, CancelOutlined, DeleteOutline } from '@mui/icons-material';

import { SchoolHoliday, HolidayCategory } from '@/features/calendar/types';

export interface HolidaysListTableProps {
  holidays: SchoolHoliday[];
  filteredHolidays: SchoolHoliday[];
  categories: HolidayCategory[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedCategoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  selectedStatusFilter: string;
  onStatusFilterChange: (status: string) => void;
  isLoadingHolidays: boolean;
  isAdmin: boolean;
  onOpenCancelModal: (holiday: SchoolHoliday) => void;
  onDeleteHoliday: (holidayId: string, holidayName: string) => void;
}

export const HolidaysListTable: React.FC<HolidaysListTableProps> = ({
  filteredHolidays,
  categories,
  searchQuery,
  onSearchQueryChange,
  selectedCategoryFilter,
  onCategoryFilterChange,
  selectedStatusFilter,
  onStatusFilterChange,
  isLoadingHolidays,
  isAdmin,
  onOpenCancelModal,
  onDeleteHoliday,
}) => {
  return (
    <Box>
      {/* Filters Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search holidays by name or description..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategoryFilter}
                label="Category"
                onChange={(e) => onCategoryFilterChange(e.target.value)}
              >
                <MenuItem value="ALL">All Categories</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatusFilter}
                label="Status"
                onChange={(e) => onStatusFilterChange(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2} sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredHolidays.length} entries
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Holiday Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Duration / Dates</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Applicability</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              {isAdmin && (
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoadingHolidays ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : filteredHolidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} align="center" sx={{ py: 6 }}>
                  <EventBusy sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography color="text.secondary">
                    No holidays found matching criteria
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredHolidays.map((h) => {
                const isMultiDay = h.start_date !== h.end_date;
                const isActive = h.status === 'active';

                return (
                  <TableRow key={h.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{h.name}</Typography>
                      {h.description && (
                        <Typography variant="caption" color="text.secondary">
                          {h.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={h.category_name} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {isMultiDay ? `${h.start_date} to ${h.end_date}` : h.start_date}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {h.is_school_wide ? (
                        <Chip size="small" label="School-Wide (All Grades)" color="info" />
                      ) : (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {h.applicable_grades.map((g) => (
                            <Chip key={g.id} size="small" label={g.name} variant="outlined" />
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={h.status.toUpperCase()}
                        color={isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        {isActive && (
                          <Tooltip title="Cancel Holiday">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => onOpenCancelModal(h)}
                            >
                              <CancelOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete (If no attendance history)">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onDeleteHoliday(h.id, h.name)}
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

