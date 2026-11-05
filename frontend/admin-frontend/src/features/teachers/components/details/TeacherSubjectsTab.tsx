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

export interface TeacherSubjectsTabProps {
  subjectAllocations: any[];
}

export default function TeacherSubjectsTab({ subjectAllocations = [] }: TeacherSubjectsTabProps) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Subject Allocations across Grades & Sections</Typography>
            {subjectAllocations && subjectAllocations.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Subject Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Subject Code</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Section</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subjectAllocations.map((alloc: any) => (
                      <TableRow key={alloc.id}>
                        <TableCell sx={{ fontWeight: 500 }}>{alloc.subject_name}</TableCell>
                        <TableCell>
                          <Chip label={alloc.subject_code} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{alloc.grade_name}</TableCell>
                        <TableCell>{alloc.section_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={alloc.status.toUpperCase()}
                            size="small"
                            color={alloc.status === 'active' ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No subject assignments currently configured for this teacher.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

