"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useGsap } from "@/lib/gsap";

const EASE = "expo.out";

/* Line-mask reveal: each word rides up from behind a clip on scroll-in.
   Splits the string itself, so no premium SplitText dependency. */
type TagName = "span" | "div" | "p" | "h1" | "h2" | "h3";

export function SplitReveal({
  text,
  as: Tag = "span",
  className = "",
  delay = 0,
  stagger = 0.045,
  start = "top 88%",
}: {
  text: string;
  as?: TagName;
  className?: string;
  delay?: number;
  stagger?: number;
  start?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { gsap } = useGsap();

  useEffect(() => {
    if (reduce || !ref.current) return;
    const words = ref.current.querySelectorAll("[data-w]");
    const ctx = gsap.context(() => {
      gsap.set(words, { yPercent: 118, rotate: 2 });
      gsap.to(words, {
        yPercent: 0,
        rotate: 0,
        duration: 1.15,
        delay,
        stagger,
        ease: EASE,
        scrollTrigger: { trigger: ref.current, start, once: true },
      });
    }, ref);
    // Failsafe: if ScrollTrigger never fires (e.g. client-side navigation), force the words
    // visible so the page is never left blank.
    const fail = setTimeout(() => {
      gsap.to(words, { yPercent: 0, rotate: 0, duration: 0.4, stagger, ease: EASE, overwrite: "auto" });
    }, 1800 + delay * 1000);
    return () => { clearTimeout(fail); ctx.revert(); };
  }, [reduce, gsap, delay, stagger, start]);

  return (
    <Tag ref={ref as never} className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span data-w className="inline-block will-change-transform">
            {w}&nbsp;
          </span>
        </span>
      ))}
    </Tag>
  );
}

/* Generic block rise + fade for paragraphs, rows, media. */
export function Rise({
  children,
  className = "",
  y = 28,
  delay = 0,
  start = "top 90%",
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { gsap } = useGsap();

  useEffect(() => {
    if (reduce || !ref.current) return;
    const el = ref.current;
    const ctx = gsap.context(() => {
      gsap.from(el, {
        y,
        opacity: 0,
        duration: 1,
        delay,
        ease: EASE,
        scrollTrigger: { trigger: el, start, once: true },
      });
    }, ref);
    // Failsafe: guarantee the block is visible even if ScrollTrigger doesn't fire on nav.
    const fail = setTimeout(() => {
      if (el) gsap.set(el, { clearProps: "opacity,transform" });
    }, 1800 + delay * 1000);
    return () => { clearTimeout(fail); ctx.revert(); };
  }, [reduce, gsap, y, delay, start]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* Count-up number, fires once on scroll into view. */
export function Counter({
  to,
  suffix = "",
  className = "",
}: {
  to: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const { gsap } = useGsap();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = `${to}${suffix}`;
      return;
    }
    const obj = { v: 0 };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        v: to,
        duration: 2,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
        onUpdate: () => {
          el.textContent = `${Math.round(obj.v)}${suffix}`;
        },
      });
    });
    return () => ctx.revert();
  }, [to, suffix, reduce, gsap]);

  return <span ref={ref} className={className}>0{suffix}</span>;
}
