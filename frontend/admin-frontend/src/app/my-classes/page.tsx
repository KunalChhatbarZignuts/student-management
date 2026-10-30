'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import { useQuery } from '@tanstack/react-query';

import ClassIcon from '@mui/icons-material/Class';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { teacherPortalApi, TeacherAssignment } from '@/features/teacher-portal/api';

export default function MyClassesPage() {
  const [selectedClass, setSelectedClass] = React.useState<TeacherAssignment | null>(null);
  const [rosterSearch, setRosterSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['teacher', 'assigned-classes'],
    queryFn: teacherPortalApi.getAssignedClasses,
  });

  const {
    data: rosterData,
    isLoading: loadingRoster,
  } = useQuery({
    queryKey: ['teacher', 'roster', selectedClass?.class_id, page, rowsPerPage, rosterSearch],
    queryFn: () =>
      teacherPortalApi.getClassRoster(selectedClass!.class_id, {
        page: page + 1,
        size: rowsPerPage,
        search: rosterSearch.trim() || undefined,
      }),
    enabled: Boolean(selectedClass?.class_id),
  });

  const handleOpenRoster = (cls: TeacherAssignment) => {
    setSelectedClass(cls);
    setPage(0);
    setRosterSearch('');
  };

  const handleCloseRoster = () => {
    setSelectedClass(null);
  };

  return (
    <RequireRole roles={[ROLES.TEACHER]}>
      <AppShell>
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: 1 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              My Classes & Teaching Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review assigned classes, subjects, and student rosters for the current academic year.
            </Typography>
          </Box>

          {error && (
            <Alert severity="info" sx={{ mb: 3 }}>
              No assigned teaching sections found. Please consult the academic administration.
            </Alert>
          )}

          {isLoading ? (
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map((i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Skeleton variant="rounded" height={180} />
                </Grid>
              ))}
            </Grid>
          ) : !assignments || assignments.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <ClassIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" fontWeight={600}>
                No Classes Assigned
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You do not currently have any active classroom or subject assignments.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {assignments.map((assignment) => (
                <Grid item xs={12} sm={6} key={assignment.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, boxShadow: 1 }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SchoolIcon color="primary" />
                          <Typography variant="h6" fontWeight={700}>
                            {assignment.class_name || 'Class'}
                          </Typography>
                        </Box>
                        <Chip
                          label={`Sec ${assignment.section || '-'}`}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <MenuBookIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={500}>
                          {assignment.subject_name || 'Subject'}{' '}
                          <Typography component="span" variant="caption" color="text.secondary">
                            ({assignment.subject_code || 'CODE'})
                          </Typography>
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                        {assignment.is_class_teacher && (
                          <Chip
                            icon={<StarIcon fontSize="small" />}
                            label="Class Teacher"
                            color="secondary"
                            size="small"
                          />
                        )}
                        <Chip
                          label={`Term: ${assignment.academic_year}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>

                    <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                      <Button
                        size="small"
                        variant="contained"
                        fullWidth
                        onClick={() => handleOpenRoster(assignment)}
                      >
                        View Student Roster
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Student Roster Dialog */}
          <Dialog
            open={Boolean(selectedClass)}
            onClose={handleCloseRoster}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {selectedClass?.class_name} - Section {selectedClass?.section} Roster
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Subject: {selectedClass?.subject_name} ({selectedClass?.subject_code})
                </Typography>
              </Box>
              <Button onClick={handleCloseRoster} color="inherit" size="small" startIcon={<CloseIcon />}>
                Close
              </Button>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2, mt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search students by name or code..."
                  value={rosterSearch}
                  onChange={(e) => {
                    setRosterSearch(e.target.value);
                    setPage(0);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {loadingRoster ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={36} />
                </Box>
              ) : !rosterData?.items || rosterData.items.length === 0 ? (
                <Alert severity="info">No active students found for this class.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>Student Code</strong></TableCell>
                        <TableCell><strong>Full Name</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rosterData.items.map((student) => (
                        <TableRow key={student.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{student.student_code}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={student.status.toUpperCase()}
                              size="small"
                              color={student.status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={rosterData.total}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 20, 50]}
                  />
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseRoster} color="primary">
                Done
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
