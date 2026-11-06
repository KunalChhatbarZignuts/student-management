import * as React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RoomIcon from '@mui/icons-material/Room';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SchoolIcon from '@mui/icons-material/School';

import { ExaminationSchedule } from '../types';

interface Props {
  schedules: ExaminationSchedule[];
  isLoading?: boolean;
}

export const UpcomingExamsList: React.FC<Props> = ({ schedules, isLoading }) => {
  if (isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading upcoming examination timetable...</Typography>
      </Paper>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: '#fafafa', borderRadius: 2 }}>
        <SchoolIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" fontWeight={600} color="text.secondary">
          No upcoming offline examinations scheduled right now.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          When new unit tests or term exams are announced, your physical examination timetable will be displayed here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2.5}>
      {schedules.map((sch) => (
        <Paper
          key={sch.id}
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 2,
            transition: 'box-shadow 0.2s',
            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
            <Box>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {sch.subject_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {sch.exam_name} • Code: <strong>{sch.subject_code}</strong>
              </Typography>
            </Box>

            <Chip
              size="small"
              icon={<SchoolIcon />}
              label="Offline Exam at School"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Grid container spacing={2} sx={{ mb: 1.5 }}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon color="action" fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {sch.exam_date}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon color="action" fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Timings
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RoomIcon color="action" fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Venue / Room
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {sch.room_number || 'Standard Classroom'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: '#f8fafc',
              gap: 1.5,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Maximum Marks: <strong>{sch.max_marks}</strong> • Passing Threshold: <strong>{sch.pass_marks}</strong>
            </Typography>

            {sch.instructions && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <InfoOutlinedIcon fontSize="small" color="primary" />
                <Typography variant="caption" color="primary.main" fontWeight={500}>
                  {sch.instructions}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      ))}
    </Stack>
  );
};

