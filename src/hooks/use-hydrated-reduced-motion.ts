'use client';

import { useSyncExternalStore } from 'react';

import { useReducedMotion } from 'motion/react';

const subscribe = (): (() => void) => () => undefined;
const getClientSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

export const useHydratedReducedMotion = (): boolean => {
  const shouldReduceMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  return hydrated && Boolean(shouldReduceMotion);
};
