'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';

interface TimetableHeaderProps {
  isParent: boolean;
  onRefresh: () => void;
  onPrint: () => void;
}

export const TimetableHeader: React.FC<TimetableHeaderProps> = ({
  isParent,
  onRefresh,
  onPrint,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Class Timetable
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isParent
            ? "View your child's weekly schedule, subject timings, and teacher assignments."
            : 'View your weekly class schedule, subject timings, and classroom locations.'}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1.5}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          size="small"
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={onPrint}
          size="small"
        >
          Print Schedule
        </Button>
      </Stack>
    </Box>
  );
};

