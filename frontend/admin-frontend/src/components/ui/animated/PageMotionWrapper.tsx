'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import Box, { BoxProps } from '@mui/material/Box';

interface PageMotionWrapperProps extends BoxProps {
  children: React.ReactNode;
  delay?: number;
}

/**
 * Standard page-level transition wrapper inspired by Vengeance UI & Skiper UI.
 * Provides a fluid opacity fade and subtle upward glide (y: 12 -> 0).
 * Automatically honors prefers-reduced-motion.
 */
export function PageMotionWrapper({ children, delay = 0, sx, ...rest }: PageMotionWrapperProps) {
  const shouldReduceMotion = useReducedMotion();
  const { ownerState, ...cleanProps } = rest as any;

  return (
    <Box
      component={motion.div}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0.05 : 0.28,
        delay,
        ease: [0.16, 1, 0.3, 1], // easeOutQuart
      }}
      sx={{ width: '100%', minHeight: '100%', ...sx }}
      {...cleanProps}
    >
      {children}
    </Box>
  );
}

export default PageMotionWrapper;
