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

    const root = document.documentElement;
    let target = 0;
    let current = 0;
    lenis.on("scroll", (e: { velocity: number }) => {
      ScrollTrigger.update();
      target = Math.max(-4, Math.min(4, e.velocity * 0.35)); // clamp skew degrees
    });

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
      target *= 0.9; // decay toward rest
      current += (target - current) * 0.15;
      root.style.setProperty("--vel", current.toFixed(3));
    };
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
      root.style.setProperty("--vel", "0");
    };
  }, [reduce, gsap, ScrollTrigger]);

  return null;
}
