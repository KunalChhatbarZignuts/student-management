'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import { GrammarEvaluationResponse } from '../types';

interface ChatGrammarCardProps {
  data: GrammarEvaluationResponse;
}

export const ChatGrammarCard: React.FC<ChatGrammarCardProps> = ({ data }) => {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        border: '1.5px solid',
        borderColor: 'primary.light',
        bgcolor: 'background.paper',
        maxWidth: 620,
        my: 1.5,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SpellcheckIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={800} color="text.primary">
              English Grammar & Expression Analysis
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.8} alignItems="center">
            <Chip
              label={`CEFR: ${data.cefr_level}`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
            <Chip
              label={`Score: ${data.overall_score}/100`}
              size="small"
              color={data.overall_score >= 80 ? 'success' : 'warning'}
              sx={{ fontWeight: 700, fontSize: 11 }}
            />
          </Stack>
        </Stack>

        {/* Sentence Comparison */}
        <Stack spacing={1} mb={2}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.2,
              borderRadius: 2,
              bgcolor: 'action.hover',
              borderStyle: 'dashed',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
              ORIGINAL INPUT
            </Typography>
            <Typography variant="body2" color="text.primary">
              "{data.original_text}"
            </Typography>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 1.2,
              borderRadius: 2,
              bgcolor: 'success.50',
              borderColor: 'success.light',
            }}
          >
            <Stack direction="row" spacing={0.5} alignItems="center" mb={0.2}>
              <CheckCircleOutlineIcon color="success" sx={{ fontSize: 14 }} />
              <Typography variant="caption" color="success.dark" fontWeight={700}>
                CORRECTED & ENHANCED
              </Typography>
            </Stack>
            <Typography variant="body2" fontWeight={600} color="success.dark">
              "{data.corrected_text}"
            </Typography>
          </Paper>
        </Stack>

        {/* Grammar Rules List */}
        {data.corrections && data.corrections.length > 0 && (
          <Box mb={2}>
            <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={1}>
              GRAMMAR CORRECTIONS & RULES
            </Typography>
            <Stack spacing={0.8}>
              {data.corrections.map((corr, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography variant="caption" fontWeight={700} color="error.main">
                    "{corr.error_phrase}" ➔{' '}
                    <Typography component="span" variant="caption" fontWeight={700} color="success.main">
                      "{corr.corrected_phrase}"
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.3}>
                    {corr.rule_explanation}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        {/* Vocabulary Upgrades */}
        {data.vocabulary_enhancements && data.vocabulary_enhancements.length > 0 && (
          <Box mb={2}>
            <Stack direction="row" spacing={0.5} alignItems="center" mb={0.8}>
              <AutoFixHighOutlinedIcon sx={{ fontSize: 14, color: 'info.main' }} />
              <Typography variant="caption" fontWeight={800} color="info.main">
                VOCABULARY UPGRADES
              </Typography>
            </Stack>
            <Stack spacing={0.6}>
              {data.vocabulary_enhancements.map((v, idx) => (
                <Typography key={idx} variant="caption" color="text.secondary" display="block">
                  • Instead of <strong>"{v.simple}"</strong>, consider <strong>"{v.advanced}"</strong> ({v.context}).
                </Typography>
              ))}
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Encouragement Footer */}
        <Stack direction="row" spacing={1} alignItems="center">
          <LightbulbOutlinedIcon color="warning" sx={{ fontSize: 16 }} />
          <Typography variant="caption" color="text.secondary" fontStyle="italic">
            {data.encouragement}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
