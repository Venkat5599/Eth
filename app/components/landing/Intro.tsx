"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useGsap } from "@/lib/gsap";

/* Page-load curtain: COBRA wordmark + a 0-100 counter, then column bars wipe up to
   reveal the page. Plays once per browser session. Skipped under reduced motion. */
export function Intro() {
  const reduce = useReducedMotion();
  const { gsap } = useGsap();
  const root = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const seen = typeof sessionStorage !== "undefined" && sessionStorage.getItem("cobra-intro");
    if (reduce || seen) {
      setDone(true);
      return;
    }
    document.body.style.overflow = "hidden";
    const counter = { v: 0 };
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          document.body.style.overflow = "";
          sessionStorage.setItem("cobra-intro", "1");
          setDone(true);
        },
      });
      tl.to(counter, {
        v: 100,
        duration: 1.6,
        ease: "power2.inOut",
        onUpdate: () => {
          if (numRef.current) numRef.current.textContent = String(Math.round(counter.v)).padStart(3, "0");
        },
      });
      tl.to(".intro-mark", { yPercent: -120, opacity: 0, duration: 0.6, ease: "power3.in" }, "+=0.15");
      tl.to(".intro-wrap", { opacity: 0, duration: 0.01 });
      tl.to(".intro-bar", { scaleY: 0, transformOrigin: "top", duration: 0.8, stagger: 0.06, ease: "expo.inOut" }, "<");
    }, root);
    return () => {
      ctx.revert();
      document.body.style.overflow = "";
    };
  }, [reduce, gsap]);

  if (done) return null;
  return (
    <div ref={root}>
      <div className="intro-wrap">
        <div className="intro-mark flex items-end gap-4">
          <span className="display text-[clamp(48px,9vw,120px)]">COBRA</span>
          <span ref={numRef} className="nums mb-3 text-[clamp(16px,2vw,24px)] text-text-faint">000</span>
        </div>
      </div>
      <div className="intro-bars">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="intro-bar" />
        ))}
      </div>
    </div>
  );
}
