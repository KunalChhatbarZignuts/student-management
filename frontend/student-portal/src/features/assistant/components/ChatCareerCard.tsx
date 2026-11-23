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
import ExploreIcon from '@mui/icons-material/Explore';
import SchoolIcon from '@mui/icons-material/School';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import { CareerDiscoveryResponse } from '../types';

interface ChatCareerCardProps {
  data: CareerDiscoveryResponse;
}

export const ChatCareerCard: React.FC<ChatCareerCardProps> = ({ data }) => {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        border: '1.5px solid',
        borderColor: 'primary.light',
        bgcolor: 'background.paper',
        maxWidth: 640,
        my: 1.5,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ExploreIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight={800} color="text.primary">
              Personalized Career Discovery
            </Typography>
          </Stack>

          <Chip
            label={data.student_grade}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: 11 }}
          />
        </Stack>

        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          {data.advice}
        </Typography>

        {/* Career Pathways */}
        <Stack spacing={1.5}>
          {data.career_pathways.map((pathway, idx) => (
            <Paper
              key={idx}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.8}>
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  {pathway.title}
                </Typography>
                <Chip
                  label={`${pathway.match_score}% Match`}
                  size="small"
                  color={pathway.match_score >= 90 ? 'success' : 'info'}
                  sx={{ fontWeight: 800, fontSize: 11 }}
                />
              </Stack>

              <Typography variant="caption" color="text.secondary" display="block" mb={1.2}>
                {pathway.description}
              </Typography>

              {/* Degrees & Skills */}
              <Stack spacing={0.6}>
                <Stack direction="row" spacing={0.8} alignItems="center">
                  <SchoolIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.primary">
                    <strong>Majors</strong>: {pathway.university_degrees.join(' • ')}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={0.8} alignItems="center">
                  <HandymanOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    <strong>Skills</strong>: {pathway.key_skills.join(' • ')}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
