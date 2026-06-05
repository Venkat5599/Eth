"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useGsap } from "@/lib/gsap";

/* A manifesto line whose words brighten from faint to full as you scroll through it.
   Scrubbed to scroll position. Reduced motion -> fully lit, static. */
export function ScrollFill({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { gsap } = useGsap();

  useEffect(() => {
    if (reduce || !ref.current) return;
    const words = ref.current.querySelectorAll("[data-fw]");
    const ctx = gsap.context(() => {
      gsap.set(words, { color: "var(--text-faint)" });
      gsap.to(words, {
        color: "var(--text)",
        ease: "none",
        stagger: 0.5,
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
          end: "bottom 55%",
          scrub: true,
        },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduce, gsap]);

  return (
    <p ref={ref} className="display max-w-[18ch] text-[clamp(32px,5vw,72px)] leading-[1.05]">
      {text.split(" ").map((w, i) => (
        <span key={i} data-fw className="inline-block">
          {w}&nbsp;
        </span>
      ))}
    </p>
  );
}
