"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "motion/react";
import { useGsap } from "@/lib/gsap";

/* Lenis smooth scroll, driven off the GSAP ticker and wired to ScrollTrigger so
   pinned/scrubbed animations stay in sync. Disabled under reduced motion. */
export function SmoothScroll() {
  const reduce = useReducedMotion();
  const { gsap, ScrollTrigger } = useGsap();

  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 0.9, smoothWheel: true });

    lenis.on("scroll", ScrollTrigger.update);
    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, [reduce, gsap, ScrollTrigger]);

  return null;
}
