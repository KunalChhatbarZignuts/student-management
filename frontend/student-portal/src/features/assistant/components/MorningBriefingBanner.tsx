'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ClassIcon from '@mui/icons-material/Class';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import { MorningBriefingResponse } from '../types';

interface MorningBriefingBannerProps {
  briefing: MorningBriefingResponse;
}

export const MorningBriefingBanner: React.FC<MorningBriefingBannerProps> = ({ briefing }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 3,
        border: '1.5px solid',
        borderColor: 'warning.light',
        bgcolor: 'background.paper',
        boxShadow: '0 4px 16px rgba(237, 108, 2, 0.08)',
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        {/* Header Summary Row */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.2}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                bgcolor: 'warning.light',
                color: 'warning.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WbSunnyIcon sx={{ fontSize: 20 }} />
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                Daily Morning Briefing • {briefing.day_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {briefing.date_str} • Welcome back, {briefing.student_name}!
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip
              label={`${briefing.classes_count} Classes Today`}
              size="small"
              color="primary"
              sx={{ fontWeight: 700, fontSize: 11 }}
            />

            {briefing.nearest_exam_name && (
              <Chip
                label={briefing.nearest_exam_name}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: 11, display: { xs: 'none', sm: 'inline-flex' } }}
              />
            )}

            <Tooltip title={isExpanded ? 'Collapse Briefing' : 'Expand Briefing'}>
              <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Collapsible Detail Section */}
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box mt={2}>
            {/* Quick Metrics Grid */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.2}
              mb={1.5}
            >
              {/* Next Class */}
              <Paper
                variant="outlined"
                sx={{
                  flex: 1,
                  p: 1.2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <ClassIcon color="primary" sx={{ fontSize: 18 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                    NEXT CLASS
                  </Typography>
                  <Typography variant="caption" fontWeight={600} color="text.primary">
                    {briefing.next_class_summary || 'No scheduled classes today'}
                  </Typography>
                </Box>
              </Paper>

              {/* Nearest Exam */}
              <Paper
                variant="outlined"
                sx={{
                  flex: 1,
                  p: 1.2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <EventAvailableIcon color="warning" sx={{ fontSize: 18 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                    EXAMINATION COUNTDOWN
                  </Typography>
                  <Typography variant="caption" fontWeight={600} color="text.primary">
                    {briefing.nearest_exam_name || 'No upcoming scheduled exams'}
                  </Typography>
                </Box>
              </Paper>

              {/* Fee Notice if balance > 0 */}
              {briefing.pending_fee_balance > 0 && (
                <Paper
                  variant="outlined"
                  sx={{
                    flex: 1,
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: 'error.50',
                    borderColor: 'error.light',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <WarningAmberIcon color="error" sx={{ fontSize: 18 }} />
                  <Box>
                    <Typography variant="caption" color="error.dark" fontWeight={700} display="block">
                      PENDING TUITION DUES
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color="error.dark">
                      ${briefing.pending_fee_balance.toFixed(2)} due this term
                    </Typography>
                  </Box>
                </Paper>
              )}
            </Stack>

            {/* Daily Quote & Recommendation */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.2,
                borderRadius: 2,
                bgcolor: 'background.default',
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" spacing={0.8} alignItems="flex-start">
                <FormatQuoteIcon sx={{ fontSize: 18, color: 'text.secondary', transform: 'rotate(180deg)' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" fontStyle="italic" display="block">
                    {briefing.inspirational_quote}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="primary.main" mt={0.5} display="block">
                    💡 {briefing.proactive_recommendation}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};
