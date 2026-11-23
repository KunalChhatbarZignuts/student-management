'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import QuizIcon from '@mui/icons-material/Quiz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ReplayIcon from '@mui/icons-material/Replay';

import { QuizGenerationResponse, QuizEvaluationResponse, QuizAnswerItem } from '../types';
import { assistantApi } from '../api';

interface ChatQuizCardProps {
  quiz: QuizGenerationResponse;
  onRetake?: () => void;
}

export default function ChatQuizCard({ quiz, onRetake }: ChatQuizCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showHint, setShowHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<QuizEvaluationResponse | null>(null);

  const currentQ = quiz.questions[currentIndex];
  const isLast = currentIndex === quiz.questions.length - 1;

  const handleSelectOption = (optIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optIndex,
    }));
  };

  const handleNext = () => {
    setShowHint(false);
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setShowHint(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload: QuizAnswerItem[] = quiz.questions.map((q) => ({
        question_id: q.id,
        selected_option_index: answers[q.id] ?? null,
      }));
      const res = await assistantApi.evaluateQuiz(quiz.quiz_id, payload);
      setEvaluation(res);
    } catch (err) {
      console.error('Quiz evaluation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setAnswers({});
    setEvaluation(null);
    setShowHint(false);
    if (onRetake) onRetake();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        my: 1.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: evaluation ? 'success.light' : 'primary.light',
        bgcolor: 'background.paper',
        maxWidth: 620,
      }}
    >
      {/* Quiz Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <QuizIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
            {quiz.subject_name} Practice Quiz
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Chip label={quiz.difficulty} size="small" color="primary" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
          {quiz.chapter_title && (
            <Chip label={quiz.chapter_title} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, maxWidth: 140 }} />
          )}
        </Stack>
      </Stack>

      {!evaluation ? (
        <>
          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Question {currentIndex + 1} of {quiz.questions.length}
              </Typography>
              <Typography variant="caption" fontWeight={700} color="primary.main">
                {Math.round(((currentIndex + 1) / quiz.questions.length) * 100)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={((currentIndex + 1) / quiz.questions.length) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>

          {/* Question Text */}
          <Typography variant="body1" fontWeight={700} color="text.primary" mb={2}>
            {currentQ.question_text}
          </Typography>

          {/* Options */}
          <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
            <RadioGroup
              value={answers[currentQ.id] !== undefined ? answers[currentQ.id] : ''}
              onChange={(_e, val) => handleSelectOption(Number(val))}
            >
              {currentQ.options.map((opt, idx) => {
                const isSelected = answers[currentQ.id] === idx;
                return (
                  <Paper
                    key={idx}
                    variant="outlined"
                    onClick={() => handleSelectOption(idx)}
                    sx={{
                      p: 1,
                      px: 1.5,
                      mb: 1,
                      borderRadius: 2,
                      cursor: 'pointer',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'action.hover' : 'background.paper',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <FormControlLabel
                      value={idx}
                      control={<Radio size="small" />}
                      label={<Typography variant="body2">{opt}</Typography>}
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Paper>
                );
              })}
            </RadioGroup>
          </FormControl>

          {/* Hint Accordion */}
          {currentQ.hint && (
            <Box sx={{ mb: 2 }}>
              <Button
                size="small"
                startIcon={<LightbulbOutlinedIcon />}
                onClick={() => setShowHint((prev) => !prev)}
                sx={{ textTransform: 'none', fontSize: 12, p: 0 }}
              >
                {showHint ? 'Hide Hint' : 'Need a Hint?'}
              </Button>
              <Collapse in={showHint}>
                <Alert severity="info" sx={{ mt: 1, py: 0.5, fontSize: 12 }}>
                  {currentQ.hint}
                </Alert>
              </Collapse>
            </Box>
          )}

          {/* Nav Buttons */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button
              size="small"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              sx={{ textTransform: 'none' }}
            >
              Previous
            </Button>
            {isLast ? (
              <Button
                variant="contained"
                size="small"
                onClick={handleSubmit}
                disabled={isSubmitting || Object.keys(answers).length === 0}
                sx={{ textTransform: 'none', px: 3, fontWeight: 700 }}
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Answers'}
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                onClick={handleNext}
                sx={{ textTransform: 'none', px: 3 }}
              >
                Next
              </Button>
            )}
          </Stack>
        </>
      ) : (
        /* Evaluation Summary Screen */
        <Box>
          <Alert
            severity={evaluation.score_percentage >= 70 ? 'success' : 'warning'}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            <Typography variant="subtitle2" fontWeight={800}>
              Score: {evaluation.correct_count} / {evaluation.total_questions} ({evaluation.score_percentage}%)
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13, mt: 0.5 }}>
              {evaluation.recommendation}
            </Typography>
          </Alert>

          {/* Detailed Question Feedback */}
          <Stack spacing={1.5} mb={2}>
            {evaluation.feedback.map((item, idx) => (
              <Paper
                key={idx}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  borderColor: item.is_correct ? 'success.light' : 'error.light',
                  bgcolor: item.is_correct ? 'success.50' : 'error.50',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                  {item.is_correct ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <CancelIcon color="error" fontSize="small" />
                  )}
                  <Typography variant="body2" fontWeight={700}>
                    Q{idx + 1}: {item.question_text}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block">
                  Your Answer: <strong>{item.student_answer}</strong> | Correct: <strong>{item.correct_answer}</strong>
                </Typography>
                <Typography variant="caption" color="text.primary" sx={{ display: 'block', mt: 0.5 }}>
                  💡 {item.explanation}
                </Typography>
              </Paper>
            ))}
          </Stack>

          <Button
            size="small"
            startIcon={<ReplayIcon />}
            onClick={handleReset}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Retake Practice Quiz
          </Button>
        </Box>
      )}
    </Paper>
  );
}
