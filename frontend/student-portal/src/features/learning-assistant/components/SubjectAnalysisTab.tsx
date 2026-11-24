'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AddTaskIcon from '@mui/icons-material/AddTask';
import CheckIcon from '@mui/icons-material/Check';

import { SubjectLearningDetail, ChapterDetail } from '../types';
import { learningAssistantApi } from '../api';

interface SubjectAnalysisTabProps {
  subjects: SubjectLearningDetail[];
  onStartChapterPractice: (chapterId: string, chapterTitle: string, subjectName: string) => void;
}

export default function SubjectAnalysisTab({ subjects, onStartChapterPractice }: SubjectAnalysisTabProps) {
  const [expandedSubject, setExpandedSubject] = useState<string | false>(
    subjects.length > 0 ? subjects[0].subject_id : false
  );
  const [scheduledTopics, setScheduledTopics] = useState<Record<string, boolean>>({});

  const handleSubjectChange = (subjectId: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSubject(isExpanded ? subjectId : false);
  };

  const handleAddToPlan = async (subjectName: string, topicTitle: string, topicId: string) => {
    try {
      await learningAssistantApi.addDailyPlanItem({
        subject_name: subjectName,
        topic_title: topicTitle,
        duration_minutes: 25,
        activity_type: 'WEAK_TOPIC_REVISION',
      });
      setScheduledTopics((prev) => ({ ...prev, [topicId]: true }));
    } catch (err) {
      console.warn('Failed to add topic to daily study plan:', err);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography variant="h6" fontWeight={700}>
          Enrolled Subjects & Curriculum Syllabus
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Explore chapter-by-chapter curriculum topics, prerequisites, and formative practice accuracy.
        </Typography>
      </Box>

      {subjects.map((subj) => {
        const isExpanded = expandedSubject === subj.subject_id;
        const progressPct = subj.total_chapters > 0 ? (subj.completed_chapters / subj.total_chapters) * 100 : 0;

        return (
          <Accordion
            key={subj.subject_id}
            expanded={isExpanded}
            onChange={handleSubjectChange(subj.subject_id)}
            sx={{
              borderRadius: '8px !important',
              border: '1px solid',
              borderColor: isExpanded ? 'primary.main' : 'divider',
              boxShadow: 'none',
              '&:before': { display: 'none' },
              overflow: 'hidden',
              mb: 1.5,
              transition: 'border-color 150ms ease',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ px: 3, py: 1.5, bgcolor: isExpanded ? 'action.hover' : 'background.paper' }}
            >
              <Grid container alignItems="center" spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <MenuBookIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {subj.subject_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Code: {subj.subject_code}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Chapter Coverage
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {subj.completed_chapters}/{subj.total_chapters}
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={progressPct} sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={1}>
                    {subj.official_exam_average !== null ? (
                      <Chip
                        label={`Exam Avg: ${subj.official_exam_average}%`}
                        color={subj.official_exam_average >= 75 ? 'success' : subj.official_exam_average >= 50 ? 'warning' : 'error'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Chip label="Enrolled" size="small" variant="outlined" />
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </AccordionSummary>

            <AccordionDetails sx={{ px: 3, py: 2.5 }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={2}>
                Curriculum Chapters & Topics
              </Typography>

              <Stack spacing={2}>
                {subj.chapters.map((ch) => (
                  <Paper
                    key={ch.id}
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      borderLeft: '4px solid',
                      borderColor: ch.status === 'COMPLETED' ? 'success.main' : ch.status === 'IN_PROGRESS' ? 'primary.main' : 'divider',
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} mb={1.5}>
                      <Box>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            Chapter {ch.chapter_number}: {ch.title}
                          </Typography>
                          <Chip
                            label={ch.status.replace('_', ' ')}
                            size="small"
                            color={ch.status === 'COMPLETED' ? 'success' : ch.status === 'IN_PROGRESS' ? 'primary' : 'default'}
                            sx={{ fontSize: 11, height: 20 }}
                          />
                        </Stack>
                        {ch.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {ch.description}
                          </Typography>
                        )}
                      </Box>

                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => onStartChapterPractice(ch.id, ch.title, subj.subject_name)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                      >
                        Practice Quiz
                      </Button>
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Topics List */}
                    <Typography variant="caption" fontWeight={600} color="text.secondary" gutterBottom>
                      Key Topics & Concepts:
                    </Typography>
                    <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                      {ch.topics.map((top) => (
                        <Grid item xs={12} md={6} key={top.id}>
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 1.5,
                              bgcolor: 'action.hover',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 1,
                            }}
                          >
                            {top.is_mastered ? (
                              <CheckCircleOutlineIcon color="success" fontSize="small" sx={{ mt: 0.2 }} />
                            ) : (
                              <RadioButtonUncheckedIcon color="disabled" fontSize="small" sx={{ mt: 0.2 }} />
                            )}
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {top.title}
                              </Typography>
                              {top.learning_objective && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {top.learning_objective}
                                </Typography>
                              )}
                              <Stack direction="row" alignItems="center" justifyContent="space-between" mt={1}>
                                <Stack direction="row" gap={1} alignItems="center">
                                  <Chip
                                    label={top.difficulty_level}
                                    size="small"
                                    sx={{ fontSize: 10, height: 18 }}
                                    color={top.difficulty_level === 'HARD' ? 'error' : top.difficulty_level === 'MEDIUM' ? 'warning' : 'default'}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    ~{top.estimated_minutes} mins
                                  </Typography>
                                </Stack>
                                {scheduledTopics[top.id] ? (
                                  <Chip
                                    icon={<CheckIcon sx={{ '&&': { fontSize: 13 } }} />}
                                    label="Added to Plan"
                                    color="success"
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: 11, height: 22 }}
                                  />
                                ) : (
                                  <Button
                                    size="small"
                                    variant="text"
                                    startIcon={<AddTaskIcon sx={{ fontSize: 14 }} />}
                                    onClick={() => handleAddToPlan(subj.subject_name, top.title, top.id)}
                                    sx={{ fontSize: 11, py: 0.25, px: 1, textTransform: 'none', minWidth: 0, fontWeight: 600 }}
                                  >
                                    Add to Plan
                                  </Button>
                                )}
                              </Stack>
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
