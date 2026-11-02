'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';

import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GradeIcon from '@mui/icons-material/Grade';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BadgeIcon from '@mui/icons-material/Badge';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import {
  useMyChildren,
  useChildAttendance,
  useChildMarks,
  useChildFees,
  useChildTimetable,
  useChildAssignments,
} from '@/features/parents/hooks';

export default function ChildrenPage() {
  const { data: children, isLoading, error } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState(0);

  const activeChild = children && children.length > 0 ? children[selectedChildIndex] : null;
  const childId = activeChild?.student_id || activeChild?.id;

  // Academic queries for active child
  const { data: attendance, isLoading: loadingAttendance } = useChildAttendance(childId);
  const { data: marks, isLoading: loadingMarks } = useChildMarks(childId);
  const { data: fees, isLoading: loadingFees } = useChildFees(childId);
  const { data: timetable, isLoading: loadingTimetable } = useChildTimetable(childId);
  const { data: assignments, isLoading: loadingAssignments } = useChildAssignments(childId);

  // Computed fees
  const totalFees = React.useMemo(() => {
    return (fees || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [fees]);

  const paidFees = React.useMemo(() => {
    return (fees || [])
      .filter((f) => f.status.toLowerCase() === 'paid')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [fees]);

  const pendingFees = totalFees - paidFees;

  return (
    <RequireRole roles={[ROLES.PARENT]}>
      <AppShell>
        <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 6 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              My Children
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comprehensive academic monitoring, attendance tracking, and performance records for your linked students.
            </Typography>
          </Box>

          {isLoading ? (
            <Skeleton variant="rounded" height={320} />
          ) : error ? (
            <Alert severity="error">
              Unable to load linked child records. Please try again later.
            </Alert>
          ) : !children || children.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
              <SchoolIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>
                No Linked Children Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
                No student accounts have been linked to your guardian profile yet. Please reach out to the school administrative office to link your student.
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Multi-child selector tabs */}
              {children.length > 1 && (
                <Paper sx={{ mb: 3, borderRadius: 2 }}>
                  <Tabs
                    value={selectedChildIndex}
                    onChange={(_, val) => {
                      setSelectedChildIndex(val);
                      setActiveTab(0);
                    }}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    {children.map((child, idx) => (
                      <Tab
                        key={child.student_id || child.id || idx}
                        label={`${child.first_name} ${child.last_name} (${child.student_code})`}
                        icon={<PersonIcon />}
                        iconPosition="start"
                        sx={{ fontWeight: 600, py: 2 }}
                      />
                    ))}
                  </Tabs>
                </Paper>
              )}

              {activeChild && (
                <>
                  {/* Child Overview Header Card */}
                  <Paper sx={{ p: 3, mb: 3, borderRadius: 3, borderLeft: 6, borderColor: 'primary.main' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'primary.light', color: '#fff' }}>
                          <SchoolIcon sx={{ fontSize: 36 }} />
                        </Box>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            <Typography variant="h5" fontWeight={700}>
                              {activeChild.first_name} {activeChild.last_name}
                            </Typography>
                            {activeChild.is_primary_guardian && (
                              <Chip
                                icon={<VerifiedUserIcon />}
                                label="Primary Guardian"
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            <Chip
                              label={activeChild.relationship_type || 'Guardian'}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                            <Chip
                              label={activeChild.status || 'Active'}
                              size="small"
                              color={activeChild.status === 'active' ? 'success' : 'default'}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Student Code: <strong>{activeChild.student_code}</strong>
                            {activeChild.enrollment_number ? ` • Enrollment: ${activeChild.enrollment_number}` : ''}
                            {activeChild.academic_year ? ` • Academic Year: ${activeChild.academic_year}` : ''}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          CLASS & SECTION
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="primary.main">
                          {activeChild.class_name} - {activeChild.section}
                        </Typography>
                        {activeChild.class_teacher_name && (
                          <Typography variant="caption" color="text.secondary">
                            Teacher: {activeChild.class_teacher_name}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Paper>

                  {/* Navigation Sub-Tabs */}
                  <Paper sx={{ mb: 3, borderRadius: 2 }}>
                    <Tabs
                      value={activeTab}
                      onChange={(_, val) => setActiveTab(val)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                      <Tab icon={<BadgeIcon />} iconPosition="start" label="Profile & Bio" />
                      <Tab icon={<EventAvailableIcon />} iconPosition="start" label="Attendance" />
                      <Tab icon={<GradeIcon />} iconPosition="start" label="Marks & Grades" />
                      <Tab icon={<CalendarMonthIcon />} iconPosition="start" label="Timetable" />
                      <Tab icon={<AssignmentIcon />} iconPosition="start" label="Assignments" />
                      <Tab icon={<ReceiptLongIcon />} iconPosition="start" label="Fees & Invoices" />
                    </Tabs>
                  </Paper>

                  {/* Tab 0: Profile & Bio */}
                  {activeTab === 0 && (
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Student Bio & Enrollment Record
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">FULL NAME</Typography>
                          <Typography variant="body1" fontWeight={600}>
                            {activeChild.first_name} {activeChild.last_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">STUDENT CODE</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.student_code}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">ENROLLMENT NUMBER</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.enrollment_number || 'N/A'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">GRADE / CLASS</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.class_name}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">SECTION</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.section}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">DEPARTMENT</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.department || 'General'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">DATE OF BIRTH</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.dob ? String(activeChild.dob) : 'N/A'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">CLASS TEACHER</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.class_teacher_name || 'Assigned'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">RELATIONSHIP TYPE</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.relationship_type}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">PRIMARY GUARDIAN</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.is_primary_guardian ? 'Yes (Primary Contact)' : 'Secondary Contact'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">VERIFICATION STATUS</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.verification_status || 'Verified'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary">LINKED SINCE</Typography>
                          <Typography variant="body1" fontWeight={600}>{activeChild.linked_at ? new Date(activeChild.linked_at).toLocaleDateString() : 'Active'}</Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  )}

                  {/* Tab 1: Attendance */}
                  {activeTab === 1 && (
                    <Box>
                      {loadingAttendance ? (
                        <Skeleton variant="rounded" height={240} />
                      ) : (
                        <>
                          <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6} md={3}>
                              <Card>
                                <CardContent>
                                  <Typography variant="caption" color="text.secondary">TOTAL CLASSES</Typography>
                                  <Typography variant="h4" fontWeight={700}>{attendance?.total_classes ?? 0}</Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Card>
                                <CardContent>
                                  <Typography variant="caption" color="text.secondary">ATTENDED CLASSES</Typography>
                                  <Typography variant="h4" fontWeight={700} color="success.main">{attendance?.attended_classes ?? 0}</Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Card>
                                <CardContent>
                                  <Typography variant="caption" color="text.secondary">EXCUSED ABSENCES</Typography>
                                  <Typography variant="h4" fontWeight={700} color="warning.main">{attendance?.excused_absences ?? 0}</Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Card>
                                <CardContent>
                                  <Typography variant="caption" color="text.secondary">ATTENDANCE RATE</Typography>
                                  <Typography variant="h4" fontWeight={700} color="primary.main">
                                    {attendance?.percentage ?? 100}%
                                  </Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={attendance?.percentage ?? 100}
                                    sx={{ mt: 1, borderRadius: 1 }}
                                  />
                                </CardContent>
                              </Card>
                            </Grid>
                          </Grid>

                          <Paper sx={{ p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                              Attendance Log
                            </Typography>
                            {(!attendance?.records || attendance.records.length === 0) ? (
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                No attendance sessions recorded yet for this student.
                              </Typography>
                            ) : (
                              <TableContainer>
                                <Table>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {attendance.records.map((r, i) => (
                                      <TableRow key={r.id || i} hover>
                                        <TableCell>{r.date}</TableCell>
                                        <TableCell>
                                          <Chip
                                            label={r.status.toUpperCase()}
                                            size="small"
                                            color={r.status === 'present' ? 'success' : r.status === 'excused' ? 'warning' : 'error'}
                                          />
                                        </TableCell>
                                        <TableCell>{r.notes || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            )}
                          </Paper>
                        </>
                      )}
                    </Box>
                  )}

                  {/* Tab 2: Marks & Grades */}
                  {activeTab === 2 && (
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Academic Evaluation & Examination Marks
                      </Typography>
                      {loadingMarks ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : !marks || marks.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No examination marks published for this student yet.
                        </Typography>
                      ) : (
                        <TableContainer sx={{ mt: 2 }}>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Subject Code</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Max Marks</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Obtained Marks</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Percentage</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Grade</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Term</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {marks.map((m) => {
                                const pct = m.max_score > 0 ? Math.round((m.obtained_score / m.max_score) * 100) : 0;
                                return (
                                  <TableRow key={m.id} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>{m.subject}</TableCell>
                                    <TableCell>{m.code}</TableCell>
                                    <TableCell align="right">{m.max_score}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                      {m.obtained_score}
                                    </TableCell>
                                    <TableCell align="center">{pct}%</TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        label={m.grade}
                                        size="small"
                                        color={m.grade.startsWith('A') ? 'success' : m.grade.startsWith('B') ? 'primary' : 'warning'}
                                      />
                                    </TableCell>
                                    <TableCell>{m.term}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Paper>
                  )}

                  {/* Tab 3: Timetable */}
                  {activeTab === 3 && (
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Class Schedule & Timetable
                      </Typography>
                      {loadingTimetable ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : !timetable?.schedule || timetable.schedule.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No timetable periods currently assigned for this class.
                        </Typography>
                      ) : (
                        <TableContainer sx={{ mt: 2 }}>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Schedule</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {timetable.schedule.map((slot, idx) => (
                                <TableRow key={idx} hover>
                                  <TableCell sx={{ fontWeight: 600 }}>{slot.subject}</TableCell>
                                  <TableCell>{slot.subject_code}</TableCell>
                                  <TableCell>{slot.teacher}</TableCell>
                                  <TableCell>
                                    <Chip label={slot.assignment_type} size="small" variant="outlined" />
                                  </TableCell>
                                  <TableCell>{slot.schedule}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Paper>
                  )}

                  {/* Tab 4: Assignments */}
                  {activeTab === 4 && (
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Class Homework & Course Assignments
                      </Typography>
                      {loadingAssignments ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : !assignments?.assignments || assignments.assignments.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          No pending homework assignments recorded for this class.
                        </Typography>
                      ) : (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          {assignments.assignments.map((item) => (
                            <Grid item xs={12} sm={6} key={item.id}>
                              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                <CardContent>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                      {item.title}
                                    </Typography>
                                    <Chip
                                      label={item.status}
                                      size="small"
                                      color={item.status === 'Assigned' ? 'info' : 'warning'}
                                    />
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Subject: <strong>{item.subject}</strong>
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Due Date: <strong>{item.due_date}</strong>
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      )}
                    </Paper>
                  )}

                  {/* Tab 5: Fees & Invoices */}
                  {activeTab === 5 && (
                    <Box>
                      {loadingFees ? (
                        <Skeleton variant="rounded" height={220} />
                      ) : (
                        <>
                          <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={4}>
                              <Card>
                                <CardContent>
                                  <Typography variant="caption" color="text.secondary">TOTAL ASSESSED FEES</Typography>
                                  <Typography variant="h4" fontWeight={700}>
                                    ${totalFees.toLocaleString()}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Card>
                                <CardContent>
                                  <Typography variant="caption" color="text.secondary">PAID AMOUNT</Typography>
                                  <Typography variant="h4" fontWeight={700} color="success.main">
                                    ${paidFees.toLocaleString()}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Card>
                                <CardContent>
                                  <Typography variant="caption" color="text.secondary">OUTSTANDING BALANCE</Typography>
                                  <Typography variant="h4" fontWeight={700} color={pendingFees > 0 ? 'error.main' : 'text.primary'}>
                                    ${pendingFees.toLocaleString()}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          </Grid>

                          <Paper sx={{ p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                              Invoice & Payment History
                            </Typography>
                            {!fees || fees.length === 0 ? (
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                No fee invoices registered for this student.
                              </Typography>
                            ) : (
                              <TableContainer sx={{ mt: 2 }}>
                                <Table>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {fees.map((inv) => (
                                      <TableRow key={inv.id} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{inv.invoice_number}</TableCell>
                                        <TableCell>{inv.description}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                                          ${inv.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>{inv.due_date}</TableCell>
                                        <TableCell>
                                          <Chip
                                            label={inv.status}
                                            size="small"
                                            color={inv.status === 'Paid' ? 'success' : 'warning'}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            )}
                          </Paper>
                        </>
                      )}
                    </Box>
                  )}
                </>
              )}
            </>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
