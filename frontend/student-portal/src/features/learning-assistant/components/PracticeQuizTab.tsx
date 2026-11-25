'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ReplayIcon from '@mui/icons-material/Replay';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';

import { PracticeSession, PracticeEvaluation, SubjectLearningDetail, StudentMistake } from '../types';
import { learningAssistantApi } from '../api';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';

interface PracticeQuizTabProps {
  subjects: SubjectLearningDetail[];
  activeSession: PracticeSession | null;
  evaluation: PracticeEvaluation | null;
  isLoading: boolean;
  onGenerateQuiz: (chapterId?: string, subjectId?: string, difficulty?: string) => Promise<void>;
  onSubmitQuiz: (sessionId: string, answers: Array<{ question_id: string; selected_option_index: number }>) => Promise<void>;
  onResetQuiz: () => void;
}

export default function PracticeQuizTab({
  subjects,
  activeSession,
  evaluation,
  isLoading,
  onGenerateQuiz,
  onSubmitQuiz,
  onResetQuiz,
}: PracticeQuizTabProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.subject_id || '');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('MEDIUM');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [mistakes, setMistakes] = useState<StudentMistake[]>([]);
  const [loadingMistakes, setLoadingMistakes] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchMistakes = async () => {
    try {
      setLoadingMistakes(true);
      const data = await learningAssistantApi.getMistakes();
      setMistakes(data);
    } catch {
      // ignore
    } finally {
      setLoadingMistakes(false);
    }
  };

  useEffect(() => {
    fetchMistakes();
  }, [evaluation]);

  const handleResolveMistake = async (id: string) => {
    try {
      setResolvingId(id);
      await learningAssistantApi.resolveMistake(id, true);
      setMistakes((prev) => prev.filter((m) => m.id !== id));
    } catch {
      // ignore
    } finally {
      setResolvingId(null);
    }
  };

  useEffect(() => {
    if (!activeSession || evaluation) {
      setElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession, evaluation]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // If evaluation is present, show results
  if (evaluation) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card
          variant="outlined"
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: '4px solid',
            borderLeftColor: evaluation.score_percentage >= 75 ? 'success.main' : 'warning.main',
            boxShadow: 'none',
          }}
        >
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" gap={2}>
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  Diagnostic Evaluation Summary
                </Typography>
                <Typography variant="h4" fontWeight={800} gutterBottom>
                  {evaluation.score_percentage}% Score
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {evaluation.correct_count} of {evaluation.total_questions} questions correct in {evaluation.chapter_title}.
                </Typography>
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  {evaluation.learning_impact}
                </Alert>
              </Box>
              <Button
                variant="contained"
                startIcon={<ReplayIcon />}
                onClick={onResetQuiz}
                sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
              >
                Take Another Quiz
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Question-by-question review */}
        <Typography variant="h6" fontWeight={700}>
          Detailed Step-by-Step Question Review
        </Typography>

        <Stack spacing={2}>
          {evaluation.results.map((r, idx) => (
            <Paper
              key={r.question_id}
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 3,
                borderLeft: '5px solid',
                borderColor: r.is_correct ? 'success.main' : 'error.main',
              }}
            >
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                {r.is_correct ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
                <Typography variant="subtitle1" fontWeight={700}>
                  Question {idx + 1}
                </Typography>
                <Chip
                  label={r.is_correct ? 'Correct' : 'Needs Review'}
                  size="small"
                  color={r.is_correct ? 'success' : 'error'}
                  sx={{ fontWeight: 600, height: 20 }}
                />
              </Stack>

              <Typography variant="body1" fontWeight={600} gutterBottom>
                {r.question_text}
              </Typography>

              <Box sx={{ mt: 1.5, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ display: 'block', mb: 0.5 }}>
                  Pedagogical Explanation:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {r.explanation}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  // If active session is in progress, show questions
  if (activeSession) {
    const questions = activeSession.questions;
    const currentQ = questions[currentQuestionIdx];
    const selectedAns = studentAnswers[currentQ.id];

    const handleSelectOption = (index: number) => {
      setStudentAnswers((prev) => ({
        ...prev,
        [currentQ.id]: index,
      }));
    };

    const handleNext = () => {
      if (currentQuestionIdx < questions.length - 1) {
        setCurrentQuestionIdx((prev) => prev + 1);
      }
    };

    const handlePrev = () => {
      if (currentQuestionIdx > 0) {
        setCurrentQuestionIdx((prev) => prev - 1);
      }
    };

    const handleSubmit = async () => {
      setIsSubmitting(true);
      try {
        const answersPayload = questions.map((q) => ({
          question_id: q.id,
          selected_option_index: studentAnswers[q.id] !== undefined ? studentAnswers[q.id] : -1,
        }));
        await onSubmitQuiz(activeSession.session_id, answersPayload);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" gap={1} mb={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {activeSession.subject_name} • {activeSession.chapter_title}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                Question {currentQuestionIdx + 1} of {questions.length}
              </Typography>
            </Box>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                <TimerOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" fontWeight={700} fontFamily="monospace" color="text.primary">
                  {formatTime(elapsedSeconds)}
                </Typography>
              </Box>
              <Chip label={`Difficulty: ${activeSession.difficulty}`} size="small" color="primary" variant="outlined" />
            </Stack>
          </Stack>

          {/* Question Jump Pills */}
          <Stack direction="row" spacing={1} mb={3} flexWrap="wrap">
            {questions.map((q, idx) => {
              const isAnswered = studentAnswers[q.id] !== undefined;
              const isCurrent = currentQuestionIdx === idx;
              return (
                <Button
                  key={q.id}
                  variant={isCurrent ? 'contained' : isAnswered ? 'outlined' : 'text'}
                  size="small"
                  onClick={() => setCurrentQuestionIdx(idx)}
                  sx={{
                    minWidth: 36,
                    height: 30,
                    p: 0,
                    borderRadius: 1,
                    fontWeight: 700,
                    fontSize: 12,
                    borderColor: isAnswered ? 'primary.main' : 'divider',
                  }}
                >
                  Q{idx + 1}
                </Button>
              );
            })}
          </Stack>

          <Typography variant="h6" fontWeight={600} mb={3}>
            {currentQ.question_text}
          </Typography>

          {/* Options */}
          <RadioGroup value={selectedAns !== undefined ? selectedAns : ''}>
            <Stack spacing={1.5}>
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAns === optIdx;
                return (
                  <Box
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'background.paper',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <FormControlLabel
                      value={optIdx}
                      control={<Radio color="primary" />}
                      label={<Typography variant="body1" fontWeight={isSelected ? 600 : 400}>{opt}</Typography>}
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </RadioGroup>

          {/* Conceptual Hint Accordion */}
          {currentQ.hint && (
            <Accordion sx={{ mt: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <LightbulbOutlinedIcon color="warning" fontSize="small" />
                  <Typography variant="body2" fontWeight={600} color="warning.main">
                    Need a Hint?
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {currentQ.hint}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Nav Buttons */}
          <Stack direction="row" justifyContent="space-between" mt={4}>
            <Button
              variant="outlined"
              disabled={currentQuestionIdx === 0}
              onClick={handlePrev}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Previous
            </Button>
            {currentQuestionIdx < questions.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600 }}
              >
                Next Question
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                disabled={isSubmitting}
                onClick={handleSubmit}
                startIcon={isSubmitting ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                sx={{ borderRadius: 2, px: 4, textTransform: 'none', fontWeight: 600 }}
              >
                Submit Quiz
              </Button>
            )}
          </Stack>
        </Paper>
      </Box>
    );
  }

  // Default Launcher Screen
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, maxWidth: 650, mx: 'auto', width: '100%' }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Adaptive Diagnostic Practice
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Test your conceptual understanding with targeted multiple-choice questions. All practice results update your formative mastery without affecting official examination grades.
        </Typography>

        <Stack spacing={2.5}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Select Subject:
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {subjects.map((s) => (
                <Chip
                  key={s.subject_id}
                  label={s.subject_name}
                  clickable
                  color={selectedSubjectId === s.subject_id ? 'primary' : 'default'}
                  onClick={() => setSelectedSubjectId(s.subject_id)}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Select Difficulty:
            </Typography>
            <Stack direction="row" gap={1}>
              {['EASY', 'MEDIUM', 'HARD'].map((diff) => (
                <Chip
                  key={diff}
                  label={diff}
                  clickable
                  color={selectedDifficulty === diff ? 'primary' : 'default'}
                  onClick={() => setSelectedDifficulty(diff)}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Box>

          <Button
            variant="contained"
            size="large"
            disabled={isLoading || !selectedSubjectId}
            startIcon={isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            onClick={() => onGenerateQuiz(undefined, selectedSubjectId, selectedDifficulty)}
            sx={{ borderRadius: 2, mt: 2, py: 1.5, textTransform: 'none', fontWeight: 700 }}
          >
            {isLoading ? 'Generating Questions...' : 'Start 5-Question Quiz'}
          </Button>
        </Stack>
      </Paper>

      {/* Mistake Bank & Misconception Remediation */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, maxWidth: 650, mx: 'auto', width: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" gap={1}>
            <BugReportOutlinedIcon color="error" />
            <Typography variant="h6" fontWeight={700}>
              Mistake Bank & Conceptual Remediation
            </Typography>
          </Stack>
          <Chip
            label={`${mistakes.filter((m) => !m.is_resolved).length} Unresolved`}
            color={mistakes.filter((m) => !m.is_resolved).length > 0 ? 'error' : 'success'}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          Review questions you missed during diagnostic practice sessions. Understanding why an answer was incorrect builds lasting conceptual mastery.
        </Typography>

        {loadingMistakes ? (
          <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />
        ) : mistakes.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="subtitle2" fontWeight={600}>
              No Active Mistakes Recorded!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Keep taking diagnostic quizzes. Any missed concepts will automatically be saved here for focused review.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {mistakes.map((m) => (
              <Card key={m.id} variant="outlined" sx={{ borderRadius: 2, borderColor: 'divider' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
                    <Stack direction="row" gap={1} alignItems="center">
                      <Chip label={m.subject_name} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                      <Chip label={m.topic_title} size="small" variant="filled" sx={{ fontWeight: 500 }} />
                    </Stack>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      disabled={resolvingId === m.id}
                      onClick={() => handleResolveMistake(m.id)}
                      startIcon={resolvingId === m.id ? <CircularProgress size={12} /> : <CheckCircleIcon />}
                      sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                    >
                      Mark Resolved
                    </Button>
                  </Stack>
                  <Typography variant="body2" fontWeight={600} mb={1}>
                    {m.question_text}
                  </Typography>
                  <Stack spacing={0.5} sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1.5, mb: 1 }}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <CancelIcon color="error" sx={{ fontSize: 16 }} />
                      <Typography variant="caption" color="error.main" fontWeight={600}>
                        Your answer: {m.student_answer}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        Correct: {m.correct_answer}
                      </Typography>
                    </Stack>
                  </Stack>
                  {m.misconception_explanation && (
                    <Box sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.15)' : '#e0f2fe'), p: 1.5, borderRadius: 1.5, borderLeft: '3px solid', borderLeftColor: 'info.main' }}>
                      <Typography variant="caption" color="info.dark" fontWeight={700} display="block" mb={0.25}>
                        Misconception & Conceptual Insight:
                      </Typography>
                      <Typography variant="caption" color="text.primary">
                        {m.misconception_explanation}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
