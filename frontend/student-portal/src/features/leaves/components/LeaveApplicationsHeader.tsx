'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

interface LeaveApplicationsHeaderProps {
  isParent: boolean;
  onApplyClick: () => void;
}

export const LeaveApplicationsHeader: React.FC<LeaveApplicationsHeaderProps> = ({
  isParent,
  onApplyClick,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Leave Applications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isParent
            ? 'Submit leave requests for your linked children and track Class Teacher approvals.'
            : 'Submit planned absence requests and monitor your Class Teacher’s review.'}
        </Typography>
      </Box>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onApplyClick}
        sx={{ borderRadius: 2 }}
      >
        Apply for Leave
      </Button>
    </Box>
  );
};

