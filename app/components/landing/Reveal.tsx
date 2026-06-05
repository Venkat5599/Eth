"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useGsap } from "@/lib/gsap";

/* Word-by-word reveal on scroll. Splits the string itself, so no premium SplitText
   dependency. Honors reduced motion (renders fully visible, no animation). */
export function SplitReveal({
  text,
  as: Tag = "span",
  className = "",
  delay = 0,
  stagger = 0.06,
}: {
  text: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { gsap } = useGsap();

  useEffect(() => {
    if (reduce || !ref.current) return;
    const words = ref.current.querySelectorAll("[data-w]");
    const ctx = gsap.context(() => {
      gsap.set(words, { yPercent: 115, opacity: 0 });
      gsap.to(words, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        delay,
        stagger,
        ease: "power4.out",
        scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduce, gsap, delay, stagger]);

  return (
    <Tag ref={ref as never} className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <span data-w className="inline-block">
            {w}&nbsp;
          </span>
        </span>
      ))}
    </Tag>
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
        duration: 1.6,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => {
          el.textContent = `${Math.round(obj.v)}${suffix}`;
        },
      });
    });
    return () => ctx.revert();
  }, [to, suffix, reduce, gsap]);

  return <span ref={ref} className={className}>0{suffix}</span>;
}
