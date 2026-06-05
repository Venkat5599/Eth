"use client";

import { motion, useScroll, useSpring } from "motion/react";

/* Hairline scroll-progress rail pinned to the top. Reads document scroll via a
   motion value (no re-renders) and eases the fill with a spring. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left"
    >
      <div className="h-full w-full" style={{ background: "var(--text)" }} />
    </motion.div>
  );
}
