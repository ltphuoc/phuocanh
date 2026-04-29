'use client';

import type { ReactElement, ReactNode } from 'react';

import { motion } from 'motion/react';

import { useHydratedReducedMotion } from '@/hooks/use-hydrated-reduced-motion';

interface PageRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
}

export const PageReveal = ({ children, className, delay = 0 }: PageRevealProps): ReactElement => {
  const reduceMotion = useHydratedReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
      transition={
        reduceMotion ? { duration: 0 } : { delay, duration: 0.38, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {children}
    </motion.div>
  );
};
