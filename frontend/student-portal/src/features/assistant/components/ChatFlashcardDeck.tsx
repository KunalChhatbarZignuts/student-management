'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import StyleIcon from '@mui/icons-material/Style';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { FlashcardDeckResponse } from '../types';

interface ChatFlashcardDeckProps {
  deck: FlashcardDeckResponse;
}

export default function ChatFlashcardDeck({ deck }: ChatFlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>({});

  const card = deck.cards[currentIndex];
  if (!card) return null;

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < deck.cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleToggleMastered = () => {
    setMasteredIds((prev) => ({
      ...prev,
      [card.id]: !prev[card.id],
    }));
  };

  const isMastered = !!masteredIds[card.id];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        my: 1.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'secondary.light',
        bgcolor: 'background.paper',
        maxWidth: 580,
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <StyleIcon color="secondary" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
            {deck.subject_name} Revision Flashcards
          </Typography>
        </Stack>
        <Chip
          label={`Card ${currentIndex + 1} of ${deck.cards.length}`}
          size="small"
          variant="outlined"
          sx={{ fontSize: 11, height: 22 }}
        />
      </Stack>

      {/* 3D Flip Flashcard */}
      <Box
        onClick={() => setIsFlipped((prev) => !prev)}
        sx={{
          minHeight: 180,
          p: 3,
          borderRadius: 2.5,
          cursor: 'pointer',
          bgcolor: isFlipped ? 'primary.50' : 'background.default',
          border: '1.5px dashed',
          borderColor: isFlipped ? 'primary.main' : 'divider',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          transition: 'all 0.25s ease',
          '&:hover': {
            borderColor: 'primary.main',
            transform: 'scale(1.01)',
          },
        }}
      >
        <Chip
          label={isFlipped ? 'ANSWER / FORMULA' : 'QUESTION / CONCEPT'}
          size="small"
          color={isFlipped ? 'primary' : 'default'}
          sx={{ mb: 1.5, fontSize: 10, height: 20, fontWeight: 700 }}
        />

        <Typography variant="h6" fontWeight={800} color="text.primary" mb={1}>
          {isFlipped ? card.back : card.front}
        </Typography>

        {!isFlipped && card.hint && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
            💡 Hint: {card.hint}
          </Typography>
        )}

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 2, opacity: 0.7 }}>
          <FlipCameraAndroidIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" color="text.secondary">
            Click anywhere to {isFlipped ? 'view prompt' : 'reveal answer'}
          </Typography>
        </Stack>
      </Box>

      {/* Bottom Controls */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mt={2}>
        <Button
          size="small"
          startIcon={<ArrowBackIosNewIcon sx={{ fontSize: 12 }} />}
          onClick={handlePrev}
          disabled={currentIndex === 0}
          sx={{ textTransform: 'none' }}
        >
          Previous
        </Button>

        <Button
          size="small"
          variant={isMastered ? 'contained' : 'outlined'}
          color={isMastered ? 'success' : 'inherit'}
          startIcon={<CheckCircleOutlineIcon />}
          onClick={handleToggleMastered}
          sx={{ textTransform: 'none', fontSize: 12 }}
        >
          {isMastered ? 'Mastered' : 'Mark as Mastered'}
        </Button>

        <Button
          size="small"
          endIcon={<ArrowForwardIosIcon sx={{ fontSize: 12 }} />}
          onClick={handleNext}
          disabled={currentIndex === deck.cards.length - 1}
          sx={{ textTransform: 'none' }}
        >
          Next
        </Button>
      </Stack>
    </Paper>
  );
}
