'use client';

import React from 'react';
import { motion } from 'motion/react';
import { TransitionProps } from '@mui/material/transitions';

/**
 * Spring-based dialog entrance and exit transition inspired by Skiper UI / Vengeance UI.
 * Compatible with Material-UI Dialog `TransitionComponent` prop.
 */
export const SmoothDialogTransition = React.forwardRef(function SmoothDialogTransition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  const {
    in: inProp,
    children,
    appear,
    onEnter,
    onEntering,
    onEntered,
    onExit,
    onExiting,
    onExited,
    addEndListener,
    ownerState,
    theme,
    timeout,
    style: propStyle,
    ...rest
  } = props as any;

  return (
    <motion.div
      ref={ref as any}
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={inProp ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
      transition={{
        type: 'spring',
        stiffness: 450,
        damping: 32,
        mass: 0.8,
      }}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        ...propStyle,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

export default SmoothDialogTransition;
