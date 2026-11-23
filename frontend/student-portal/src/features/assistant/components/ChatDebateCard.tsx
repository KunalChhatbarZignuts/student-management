'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import { DebateRoundResponse } from '../types';

interface ChatDebateCardProps {
  data: DebateRoundResponse;
  onSelectRebuttalPrompt?: (prompt: string) => void;
}

export const ChatDebateCard: React.FC<ChatDebateCardProps> = ({
  data,
  onSelectRebuttalPrompt,
}) => {
  const roundLabels: Record<number, string> = {
    1: 'Round 1 of 3: Opening Arguments',
    2: 'Round 2 of 3: Rebuttal & Cross-Examination',
    3: 'Round 3 of 3: Closing Arguments',
  };

  const scorecard = data.rubric_scorecard;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        border: '1.5px solid',
        borderColor: data.is_concluded ? 'warning.main' : 'info.main',
        bgcolor: 'background.paper',
        maxWidth: 640,
        my: 1.5,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <GavelIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={800} color="text.primary">
              AI Debate Partner
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.8} alignItems="center">
            <Chip
              label={`Stance: ${data.stance.toUpperCase()}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
            <Chip
              label={data.is_concluded ? 'Debate Concluded' : roundLabels[data.current_round] || `Round ${data.current_round}/3`}
              size="small"
              color={data.is_concluded ? 'warning' : 'info'}
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
          </Stack>
        </Stack>

        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1.5}>
          TOPIC: {data.topic}
        </Typography>

        {/* AI Counter-Argument Box */}
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'action.hover',
            mb: 1.5,
          }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={800} display="block" mb={0.5}>
            OPPOSING ARGUMENT (AI):
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.6 }}>
            {data.ai_counter_argument}
          </Typography>
        </Paper>

        {/* Student Critique */}
        {data.student_argument_critique && (
          <Paper
            variant="outlined"
            sx={{
              p: 1.2,
              borderRadius: 2,
              borderColor: 'info.light',
              bgcolor: 'info.50',
              mb: 1.5,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="info.dark" display="block">
              ADJUDICATION CRITIQUE
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {data.student_argument_critique}
            </Typography>
          </Paper>
        )}

        {/* Rebuttal Suggestions */}
        {!data.is_concluded && data.suggested_rebuttal_points && data.suggested_rebuttal_points.length > 0 && (
          <Box mb={1}>
            <Stack direction="row" spacing={0.5} alignItems="center" mb={0.8}>
              <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                SUGGESTED REBUTTAL ANGLES (CLICK TO USE):
              </Typography>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={0.8}>
              {data.suggested_rebuttal_points.map((hint, idx) => (
                <Chip
                  key={idx}
                  label={hint}
                  size="small"
                  clickable={!!onSelectRebuttalPrompt}
                  onClick={() => onSelectRebuttalPrompt?.(hint)}
                  sx={{ fontSize: 11 }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Final Rubric Scorecard */}
        {data.is_concluded && scorecard && (
          <Paper
            variant="outlined"
            sx={{
              p: 1.8,
              borderRadius: 2.5,
              borderColor: 'warning.light',
              bgcolor: 'warning.50',
              mt: 2,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <EmojiEventsIcon color="warning" />
              <Typography variant="subtitle2" fontWeight={800} color="warning.dark">
                Final Debate Rubric Scorecard
              </Typography>
              <Chip
                label={`${scorecard.total_score}/30 Points`}
                color="warning"
                size="small"
                sx={{ fontWeight: 800, ml: 'auto' }}
              />
            </Stack>

            <Typography variant="body2" color="text.secondary" mb={2}>
              {scorecard.verdict_summary}
            </Typography>

            {/* Metric Bars */}
            <Stack spacing={1.2} mb={2}>
              <Box>
                <Stack direction="row" justifyContent="space-between" mb={0.3}>
                  <Typography variant="caption" fontWeight={600}>Logic & Premise</Typography>
                  <Typography variant="caption" fontWeight={700}>{scorecard.logic_score}/10</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={scorecard.logic_score * 10} color="primary" sx={{ borderRadius: 1 }} />
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" mb={0.3}>
                  <Typography variant="caption" fontWeight={600}>Evidence & Context</Typography>
                  <Typography variant="caption" fontWeight={700}>{scorecard.evidence_score}/10</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={scorecard.evidence_score * 10} color="info" sx={{ borderRadius: 1 }} />
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" mb={0.3}>
                  <Typography variant="caption" fontWeight={600}>Clarity & Delivery</Typography>
                  <Typography variant="caption" fontWeight={700}>{scorecard.clarity_score}/10</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={scorecard.clarity_score * 10} color="success" sx={{ borderRadius: 1 }} />
              </Box>
            </Stack>

            <Divider sx={{ my: 1 }} />

            <Stack spacing={0.5}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                KEY STRENGTHS:
              </Typography>
              {scorecard.strengths.map((s, idx) => (
                <Typography key={idx} variant="caption" color="text.secondary">
                  ✓ {s}
                </Typography>
              ))}
            </Stack>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};
