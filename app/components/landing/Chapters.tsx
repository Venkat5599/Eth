"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { Lightning, ShieldCheck, EnvelopeSimple, Bank } from "@phosphor-icons/react";
import { useGsap } from "@/lib/gsap";

type Chapter = {
  n: string;
  kicker: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  tint: string;   // paper tone per chapter (last one inverts to ink)
  dark?: boolean; // ink-inverted panel (the single allowed theme flip)
};

// the single allowed theme flip: one chapter inverts to a light panel with ink text
const LIGHT_VARS = {
  ["--text" as string]: "#16140f",
  ["--text-dim" as string]: "#56524a",
  ["--text-faint" as string]: "#8a857a",
  ["--accent" as string]: "#16140f",
  ["--accent-dim" as string]: "#d8d3c6",
  ["--border-strong" as string]: "#c7c2b4",
} as React.CSSProperties;

const CHAPTERS: Chapter[] = [
  {
    n: "01",
    kicker: "It chases",
    title: "Your invoices, worked while you sleep.",
    body: "The agent follows up on every overdue invoice, escalating tone over time, across email and chat. You stop being the person who nags clients.",
    icon: <EnvelopeSimple weight="regular" />,
    tint: "#0c0d10",
  },
  {
    n: "02",
    kicker: "It underwrites",
    title: "It learns which clients actually pay.",
    body: "Every settled invoice sharpens a private payment graph. Cobra knows the client who pays in four days from the one who ghosts for forty.",
    icon: <ShieldCheck weight="regular" />,
    tint: "#101216",
  },
  {
    n: "03",
    kicker: "It pays you early",
    title: "Cash today, on an invoice they have not paid.",
    body: "Because the credit decision is provable, Cobra advances your money now and collects from the client later. No bank. No factoring desk.",
    icon: <Lightning weight="regular" />,
    tint: "#15171c",
  },
  {
    n: "04",
    kicker: "It settles",
    title: "Pesos in your bank. Taxes already filed.",
    body: "A slice held in MXNe, the rest off-ramped via SPEI, and the tax doc generated. The whole back office, gone.",
    icon: <Bank weight="regular" />,
    tint: "#f3f1ea",
    dark: true,
  },
];

export function Chapters() {
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { gsap, ScrollTrigger } = useGsap();

  useEffect(() => {
    if (reduce || !root.current) return;
    const panels = gsap.utils.toArray<HTMLElement>(".chapter", root.current);
    const ctx = gsap.context(() => {
      panels.forEach((panel, i) => {
        if (i === panels.length - 1) return;
        // as the NEXT panel slides up over this one, shrink + dim + blur it
        gsap.to(panel.querySelector(".chapter-inner"), {
          scale: 0.9,
          opacity: 0.35,
          filter: "blur(4px)",
          ease: "none",
          scrollTrigger: {
            trigger: panels[i + 1],
            start: "top bottom",
            end: "top top",
            scrub: true,
          },
        });
      });
    }, root);
    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, [reduce, gsap, ScrollTrigger]);

  return (
    <div ref={root} className="relative">
      {CHAPTERS.map((c, i) => (
        <section
          key={c.n}
          className="chapter"
          style={{ background: c.tint, zIndex: i + 1, ...(c.dark ? LIGHT_VARS : {}) }}
        >
          <div className="chapter-inner shell relative grid w-full grid-cols-1 items-center gap-10 py-20 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex items-center gap-3 text-text-dim">
                <span
                  className="nums grid h-9 w-9 place-items-center rounded-full border text-[13px]"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
                >
                  {c.n}
                </span>
                <span className="text-[13px] uppercase tracking-[0.28em]">[ {c.kicker} ]</span>
              </div>
              <h2 className="display mt-7 text-[clamp(34px,6vw,80px)]">{c.title}</h2>
              <p className="mt-7 max-w-[46ch] text-[clamp(15px,1.4vw,19px)] leading-relaxed text-text-dim">
                {c.body}
              </p>
            </div>

            <div className="relative">
              {i === CHAPTERS.length - 1 ? (
                <div className="overflow-hidden rounded-[6px] border border-border-strong">
                  <Image
                    src="/cobra-dashboard.png"
                    alt="Cobra dashboard with a live invoice advance"
                    width={1037}
                    height={700}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="relative grid aspect-square place-items-center rounded-[6px] border border-border-strong">
                  <span className="absolute left-4 top-3 nums text-[12px] tracking-[0.2em] text-text-faint">
                    FIG. {c.n}
                  </span>
                  <span style={{ color: "var(--text)", fontSize: "clamp(70px,14vw,180px)" }}>
                    {c.icon}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
