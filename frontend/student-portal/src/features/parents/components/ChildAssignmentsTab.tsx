'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { ChildAssignmentsResponse } from '../types';

interface ChildAssignmentsTabProps {
  assignments?: ChildAssignmentsResponse | null;
  isLoading: boolean;
}

export const ChildAssignmentsTab: React.FC<ChildAssignmentsTabProps> = ({
  assignments,
  isLoading,
}) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Class Homework & Course Assignments
      </Typography>
      {isLoading ? (
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
  );
};
