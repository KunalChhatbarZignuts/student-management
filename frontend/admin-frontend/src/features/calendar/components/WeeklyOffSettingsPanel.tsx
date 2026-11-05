import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import { Weekend, WorkOutline, Add as AddIcon, DeleteOutline } from '@mui/icons-material';

import { SpecialWorkingDay } from '@/features/calendar/types';

export interface WeeklyOffSettingsPanelProps {
  specialWorkingDays: SpecialWorkingDay[];
  onOpenSpecialModal: () => void;
  onDeleteSpecial: (id: string) => void;
}

export const WeeklyOffSettingsPanel: React.FC<WeeklyOffSettingsPanelProps> = ({
  specialWorkingDays,
  onOpenSpecialModal,
  onDeleteSpecial,
}) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
            >
              <Weekend color="primary" />
              Standard Weekly Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Standard institutional operational schedule for academic attendance and timetables.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  Monday – Saturday
                </Typography>
                <Chip label="Regular Working Days" color="success" size="small" />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  Sunday
                </Typography>
                <Chip label="Standard Weekly Off" color="default" size="small" />
              </Box>
            </Box>

            <Alert severity="info">
              Monday through Saturday are official teaching days. Sunday is the default weekly
              holiday. Use Special Working Days (on the right) to designate specific Sundays or
              holidays as compensatory class days.
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <WorkOutline color="warning" />
                Compensatory Special Working Days
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={onOpenSpecialModal}
              >
                Add
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Special days (such as Saturday or Sunday) when school is declared open to compensate
              for unexpected closures.
            </Typography>

            {specialWorkingDays.length === 0 ? (
              <Alert severity="success">No compensatory working days declared.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {specialWorkingDays.map((sp) => (
                      <TableRow key={sp.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{sp.date}</TableCell>
                        <TableCell>{sp.reason}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onDeleteSpecial(sp.id)}
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

