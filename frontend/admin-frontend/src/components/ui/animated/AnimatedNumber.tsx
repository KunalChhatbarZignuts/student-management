'use client';

import React, { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useTransform, motion } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatFn?: (val: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Animated rolling number counter inspired by AnimMaster Lib / Motion.dev.
 * Automatically animates from previous value to new value using spring physics.
 */
export function AnimatedNumber({
  value,
  formatFn = (v) => Math.round(v).toLocaleString(),
  style,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, {
    stiffness: 120,
    damping: 24,
    mass: 0.8,
  });

  const display = useTransform(springVal, (current) => formatFn(current));

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  return <motion.span ref={ref} style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums', ...style }}>{display}</motion.span>;
}

export default AnimatedNumber;
