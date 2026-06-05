"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useGsap } from "@/lib/gsap";

/* Kinetic strip. Loops continuously; scroll velocity nudges direction/speed for the
   physical "Inertia" feel. Collapses to a static line under reduced motion. */
export function Marquee({ text, outline }: { text: string; outline?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { gsap, ScrollTrigger } = useGsap();

  useEffect(() => {
    if (reduce || !track.current) return;
    const el = track.current;
    const half = el.scrollWidth / 2;
    const ctx = gsap.context(() => {
      const tween = gsap.to(el, { x: -half, duration: 18, ease: "none", repeat: -1 });
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const v = self.getVelocity();
          gsap.to(tween, { timeScale: 1 + Math.min(Math.abs(v) / 1200, 3), duration: 0.4, overwrite: true });
          gsap.delayedCall(0.3, () => gsap.to(tween, { timeScale: 1, duration: 0.6, overwrite: true }));
        },
      });
      return () => st.kill();
    }, track);
    return () => ctx.revert();
  }, [reduce, gsap, ScrollTrigger]);

  const items = Array.from({ length: 8 });
  return (
    <div className="relative overflow-hidden border-y border-border py-5">
      <div ref={track} className="marquee-track">
        {items.map((_, i) => (
          <span
            key={i}
            className={`display mr-8 text-[clamp(28px,5vw,64px)] ${outline ? "outline-word" : ""}`}
            style={outline ? undefined : { color: i % 2 ? "var(--accent)" : "var(--text)" }}
          >
            {text}
            <span className="mx-6" style={{ color: "var(--accent)" }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
