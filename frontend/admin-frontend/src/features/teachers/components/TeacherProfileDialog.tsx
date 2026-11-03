'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import { useQuery } from '@tanstack/react-query';

import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';

import { teacherSubjectApi, teacherSubjectKeys } from '../subjectApi';

interface TeacherProfileDialogProps {
  open: boolean;
  onClose: () => void;
  teacherId: string | null;
}

export default function TeacherProfileDialog({
  open,
  onClose,
  teacherId,
}: TeacherProfileDialogProps) {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: teacherSubjectKeys.profile(teacherId || ''),
    queryFn: () => teacherSubjectApi.getTeacherProfile(teacherId!),
    enabled: open && Boolean(teacherId),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon color="primary" />
        Faculty Profile & Academic Assignments
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load teacher profile details.</Alert>
        ) : !profile ? (
          <Alert severity="info">No profile found for this instructor.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header / Teacher Details Card */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Instructor Name
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {profile.full_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Employee Code
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {profile.employee_code || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Department
                  </Typography>
                  <Typography variant="body1">
                    {profile.department}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Contact Email / Phone
                  </Typography>
                  <Typography variant="body2">
                    {profile.email || '-'} {profile.phone ? `(${profile.phone})` : ''}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Assigned Homeroom & Coordinated Sections */}
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon fontSize="small" color="secondary" />
                Assigned Grades & Sections (Class Leadership)
              </Typography>
              {profile.assigned_sections && profile.assigned_sections.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Section</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Role / Assignment Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Academic Year</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profile.assigned_sections.map((sec) => (
                        <TableRow key={sec.assignment_id}>
                          <TableCell>{sec.grade_name}</TableCell>
                          <TableCell>{sec.section_name}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={sec.assignment_type === 'CLASS_TEACHER' ? 'Class Teacher' : 'Grade Coordinator'}
                              color={sec.assignment_type === 'CLASS_TEACHER' ? 'secondary' : 'primary'}
                            />
                          </TableCell>
                          <TableCell>{sec.academic_year}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
                  No homeroom or section coordination assigned.
                </Typography>
              )}
            </Box>

            <Divider />

            {/* Assigned Teaching Subjects */}
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MenuBookIcon fontSize="small" color="primary" />
                Assigned Subjects & Curriculum
              </Typography>
              {profile.assigned_subjects && profile.assigned_subjects.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Section</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Academic Year</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profile.assigned_subjects.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{sub.subject_name || '-'}</TableCell>
                          <TableCell>{sub.subject_code || '-'}</TableCell>
                          <TableCell>{sub.grade_name || 'All Grades'}</TableCell>
                          <TableCell>{sub.section_name ? `Sec ${sub.section_name}` : 'All Sections'}</TableCell>
                          <TableCell>{sub.academic_year_name || 'All Terms'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={sub.status}
                              color={sub.status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
                  No subjects currently assigned to this teacher.
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

