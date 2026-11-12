"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

import { DURATION, EASE } from "./MotionProvider";

/**
 * Page transitions.
 *
 * A cross-fade with a slight vertical movement. The animation never blocks
 * navigation: the links stay operable and the content of the incoming page
 * is present in the document while the transition runs.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          duration: DURATION.base,
          ease: EASE,
          // Content is never hidden for longer than the transition itself.
          opacity: { duration: DURATION.quick },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
