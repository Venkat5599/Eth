"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { Asterisk } from "@phosphor-icons/react";
import { useGsap } from "@/lib/gsap";

const CHAINS = ["Base", "Arbitrum", "Ethereum"];

/* One repeating unit: the phrase, then each chain, each separated by a spinning mark.
   The whole strip loops; scroll velocity nudges its speed (Inertia feel). */
function Unit({ phrase }: { phrase: string }) {
  const items = [phrase, ...CHAINS];
  return (
    <span className="flex items-center">
      {items.map((it, i) => (
        <span key={i} className="flex items-center">
          <span
            className={`display mx-7 text-[clamp(30px,5.2vw,68px)] ${i === 0 ? "" : "outline-word"}`}
          >
            {it}
          </span>
          <Asterisk
            className={i % 2 ? "spin-fast" : "spin"}
            size={28}
            weight="bold"
            color="var(--text-faint)"
          />
        </span>
      ))}
    </span>
  );
}

export function Marquee({ text }: { text: string }) {
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { gsap, ScrollTrigger } = useGsap();

  useEffect(() => {
    if (reduce || !track.current) return;
    const el = track.current;
    const half = el.scrollWidth / 2;
    const ctx = gsap.context(() => {
      const tween = gsap.to(el, { x: -half, duration: 22, ease: "none", repeat: -1 });
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const v = Math.abs(self.getVelocity());
          gsap.to(tween, { timeScale: 1 + Math.min(v / 1400, 3), duration: 0.4, overwrite: true });
          gsap.delayedCall(0.25, () => gsap.to(tween, { timeScale: 1, duration: 0.6, overwrite: true }));
        },
      });
      return () => st.kill();
    }, track);
    return () => ctx.revert();
  }, [reduce, gsap, ScrollTrigger]);

  return (
    <div className="relative overflow-hidden border-y border-border py-6">
      <div ref={track} className="marquee-track">
        {Array.from({ length: 4 }).map((_, i) => (
          <Unit key={i} phrase={text} />
        ))}
      </div>
    </div>
  );
}
