"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useGsap } from "@/lib/gsap";

/* Signature Awwwards move: vertical scroll drives a horizontal pan through a pinned
   track of panels. Synced to Lenis via ScrollTrigger. Reduced motion -> plain stack. */

const PANELS = [
  ["01", "Stylus", "One Rust→WASM contract holds the treasury and the governance rules."],
  ["02", "Membership", "Voting power is granted on-chain. Your weight is your stake."],
  ["03", "Proposals", "Any member opens a grant. It's public the instant it's signed."],
  ["04", "Voting", "Weighted for/against, one ballot each, inside a fixed window."],
  ["05", "Quorum", "Majority plus minimum turnout — the bar is in the code."],
  ["06", "Payout", "Passed proposals execute themselves. The treasury sends the grant."],
];

export function HorizontalPan() {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { gsap, ScrollTrigger } = useGsap();

  useEffect(() => {
    if (reduce || !wrap.current || !track.current) return;
    const ctx = gsap.context(() => {
      const distance = () => track.current!.scrollWidth - window.innerWidth;
      gsap.to(track.current, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: wrap.current,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, wrap);
    return () => ctx.revert();
  }, [reduce, gsap, ScrollTrigger]);

  return (
    <section ref={wrap} className="relative overflow-hidden border-y border-border">
      {/* header overlays the pinned viewport */}
      <div className="shell pointer-events-none absolute left-0 right-0 top-8 z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-text-faint">
        <span>[ What the DAO runs on ]</span>
        <span className="hidden sm:block">Scroll →</span>
      </div>
      <div
        ref={track}
        className="flex h-[100dvh] w-max items-center gap-0 max-lg:h-auto max-lg:w-full max-lg:flex-col"
      >
        {PANELS.map(([n, title, body], i) => (
          <article
            key={n}
            className="flex h-[100dvh] w-[78vw] shrink-0 flex-col justify-center border-l border-border px-[6vw] max-lg:h-auto max-lg:w-full max-lg:border-l-0 max-lg:border-t max-lg:py-20 lg:w-[44vw]"
            style={{ background: i % 2 ? "var(--surface)" : "transparent" }}
          >
            <span className="nums text-[clamp(60px,9vw,150px)] leading-none text-text-faint/40" style={{ color: "var(--border-strong)" }}>
              {n}
            </span>
            <h3 className="display mt-6 text-[clamp(40px,5vw,84px)]">{title}</h3>
            <p className="mt-6 max-w-[36ch] text-[clamp(15px,1.4vw,20px)] leading-relaxed text-text-dim">
              {body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
