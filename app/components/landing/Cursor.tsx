"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";

/* Blended ring cursor that grows over interactive elements. Desktop fine-pointer only;
   disabled on touch and under reduced motion (native cursor stays). */
export function Cursor() {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false);
  const [active, setActive] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    setOn(true);
    document.documentElement.classList.add("has-cursor");
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as HTMLElement;
      setActive(!!t.closest("a, button, [data-cursor]"));
    };
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [reduce, x, y]);

  if (!on) return null;
  return (
    <motion.div
      className="cursor-dot"
      style={{ x: sx, y: sy }}
      animate={{ width: active ? 46 : 14, height: active ? 46 : 14, opacity: active ? 0.8 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    />
  );
}
