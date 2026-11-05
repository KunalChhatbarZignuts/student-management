'use client';

import * as React from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface TeacherAttendanceTabProps {
  hrNotice?: string;
  attendanceActivity: any[];
}

export default function TeacherAttendanceTab({
  hrNotice,
  attendanceActivity = [],
}: TeacherAttendanceTabProps) {
  return (
    <Grid container spacing={3}>
      {hrNotice && (
        <Grid item xs={12}>
          <Alert icon={<InfoOutlinedIcon fontSize="inherit" />} severity="info" sx={{ mb: 3 }}>
            {hrNotice}
          </Alert>
        </Grid>
      )}

      <Grid item xs={12}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Student Attendance Sessions Recorded by Teacher</Typography>
            {attendanceActivity && attendanceActivity.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Session Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Grade & Section</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Students Present</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Recorded Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceActivity.map((act: any) => (
                      <TableRow key={act.id}>
                        <TableCell sx={{ fontWeight: 500 }}>{act.date}</TableCell>
                        <TableCell>{act.grade_name} - {act.section_name}</TableCell>
                        <TableCell>{act.subject_name || 'Class Roll-Call'}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${act.present_count} / ${act.total_students} Present`}
                            size="small"
                            color={act.present_count === act.total_students ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{new Date(act.recorded_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No student attendance sessions conducted by this teacher recorded yet.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

