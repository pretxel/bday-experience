"use client";

import { createContext, useContext, useMemo } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Shared motion preferences.
 *
 * The provider gives the client islands one place to read the reduced-motion
 * preference and the shared easing curves, so the whole experience moves with
 * the same rhythm.
 */

export const EASE = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  quick: 0.35,
  base: 0.7,
  slow: 1.1,
} as const;

interface MotionContextValue {
  /** True when the visitor asked for reduced motion. */
  reduceMotion: boolean;
}

const MotionContext = createContext<MotionContextValue>({
  reduceMotion: false,
});

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion() ?? false;

  const value = useMemo<MotionContextValue>(() => ({ reduceMotion }), [reduceMotion]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

/** Read the shared motion preferences. */
export function useMotionPreferences(): MotionContextValue {
  return useContext(MotionContext);
}
