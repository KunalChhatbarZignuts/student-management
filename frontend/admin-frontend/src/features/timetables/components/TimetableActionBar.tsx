'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import RefreshIcon from '@mui/icons-material/Refresh';

import { Shift, TimetableDetail, ClashValidationResult } from '@/features/timetables/types';

export interface TimetableActionBarProps {
  timetableData?: TimetableDetail | null;
  activeShift?: Shift;
  hasPeriods: boolean;
  onRefresh: () => void;
  onValidate: () => void;
  isValidating: boolean;
  onSaveDraft: () => void;
  isSaving: boolean;
  onPublish: () => void;
  isPublishing: boolean;
  clashResult: ClashValidationResult | null;
}

export default function TimetableActionBar({
  timetableData,
  activeShift,
  hasPeriods,
  onRefresh,
  onValidate,
  isValidating,
  onSaveDraft,
  isSaving,
  onPublish,
  isPublishing,
  clashResult,
}: TimetableActionBarProps) {
  const statusLabel =
    timetableData?.status === 'published'
      ? `Published (v${timetableData.version})`
      : timetableData?.status === 'draft'
      ? `Draft (v${timetableData.version})`
      : 'No Timetable Created';

  const statusColor =
    timetableData?.status === 'published'
      ? 'success'
      : timetableData?.status === 'draft'
      ? 'warning'
      : 'default';

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mb: 2,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
        <Chip label={statusLabel} color={statusColor} sx={{ fontWeight: 600 }} />
        {activeShift ? (
          <Chip
            icon={<AccessTimeIcon />}
            label={`Shift: ${activeShift.name} (${activeShift.start_time} - ${activeShift.end_time})`}
            variant="outlined"
            color="primary"
          />
        ) : (
          <Chip
            icon={<WarningAmberIcon />}
            label="No Shift Assigned to Grade"
            variant="outlined"
            color="warning"
          />
        )}
        <Button
          variant="text"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          size="small"
        >
          Refresh
        </Button>
      </Stack>

      {/* Action Buttons */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<CheckCircleOutlineIcon />}
          onClick={onValidate}
          disabled={isValidating || !hasPeriods}
        >
          {isValidating ? 'Validating...' : 'Validate Clashes'}
        </Button>

        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={onSaveDraft}
          disabled={isSaving || !hasPeriods}
        >
          {isSaving ? 'Saving...' : 'Save Draft'}
        </Button>

        <Button
          variant="contained"
          color="success"
          startIcon={<PublishIcon />}
          onClick={onPublish}
          disabled={
            isPublishing ||
            !timetableData?.id ||
            clashResult?.has_clashes === true
          }
        >
          {isPublishing ? 'Publishing...' : 'Publish'}
        </Button>
      </Stack>
    </Box>
  );
}
