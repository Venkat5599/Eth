"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useGsap } from "@/lib/gsap";

type Chapter = {
  n: string;
  kicker: string;
  title: string;
  body: string;
  tint: string;   // panel tone per chapter (last one inverts to light)
  dark?: boolean; // light-inverted panel (the single allowed theme flip)
};

// the single allowed theme flip: one chapter inverts to a light panel with ink text
const LIGHT_VARS = {
  ["--text" as string]: "#16140f",
  ["--text-dim" as string]: "#56524a",
  ["--text-faint" as string]: "#8a857a",
  ["--accent" as string]: "#16140f",
  ["--accent-dim" as string]: "#d8d3c6",
  ["--border" as string]: "#cfc9bb",
  ["--border-strong" as string]: "#bdb6a6",
  ["--surface" as string]: "#e9e4d8",
} as React.CSSProperties;

const CHAPTERS: Chapter[] = [
  {
    n: "01",
    kicker: "It chases",
    title: "Your invoices, worked while you sleep.",
    body: "The agent follows up on every overdue invoice, escalating tone over time, across email and chat. You stop being the person who nags clients.",
    tint: "#0c0d10",
  },
  {
    n: "02",
    kicker: "It underwrites",
    title: "It learns which clients actually pay.",
    body: "Every settled invoice sharpens a private payment graph. Cobra knows the client who pays in four days from the one who ghosts for forty.",
    tint: "#101216",
  },
  {
    n: "03",
    kicker: "It pays you early",
    title: "Cash today, on an invoice they have not paid.",
    body: "Because the credit decision is provable, Cobra advances your money now and collects from the client later. No bank. No factoring desk.",
    tint: "#15171c",
  },
  {
    n: "04",
    kicker: "It settles",
    title: "Pesos in your bank. Taxes already filed.",
    body: "A slice held in MXNe, the rest off-ramped via SPEI, and the tax doc generated. The whole back office, gone.",
    tint: "#f3f1ea",
    dark: true,
  },
];

/* ---- bespoke mono data-figures (the right column of each chapter) ---- */

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-border bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="nums text-[11px] uppercase tracking-[0.2em] text-text-faint">{label}</span>
        <span className="flex gap-1.5">
          <i className="h-2 w-2 rounded-full border border-border-strong" />
          <i className="h-2 w-2 rounded-full border border-border-strong" />
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const Row = ({ children, last }: { children: React.ReactNode; last?: boolean }) => (
  <div className={`flex items-center justify-between gap-4 py-3.5 ${last ? "" : "border-b border-border"}`}>{children}</div>
);

function ChaseFig() {
  const nudges = [
    ["Friendly", "Quick note on invoice INV-3001", "sent · day 1"],
    ["Firm", "Invoice INV-3001 is now overdue", "sent · day 4"],
    ["Final", "Final notice: INV-3001 ($3,000)", "queued · day 7"],
  ];
  return (
    <Panel label="agent / outbox">
      {nudges.map(([tone, subj, meta], i) => (
        <Row key={i} last={i === nudges.length - 1}>
          <div className="min-w-0">
            <div className="text-[13px]">
              <span className="mr-2 uppercase tracking-[0.1em] text-text-faint">{tone}</span>
              <span className="text-text">{subj}</span>
            </div>
            <div className="nums mt-1 text-[11px] text-text-faint">to client · {meta}</div>
          </div>
          <span className="nums text-[11px] text-text-dim">{String(i + 1).padStart(2, "0")}</span>
        </Row>
      ))}
    </Panel>
  );
}

function GraphFig() {
  const clients = [
    ["Acme Robotics", 98],
    ["Vela Studio", 81],
    ["Nimbus Labs", 56],
    ["Orin Foundry", 34],
  ] as const;
  return (
    <Panel label="client payment graph">
      {clients.map(([name, score], i) => (
        <div key={name} className={`py-3.5 ${i === clients.length - 1 ? "" : "border-b border-border"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[13px]">{name}</span>
            <span className="nums text-[13px] text-text">{score}</span>
          </div>
          <div className="mt-2 h-[3px] w-full bg-[var(--accent-dim)]">
            <div className="h-full bg-[var(--text)]" style={{ width: `${score}%`, opacity: score >= 65 ? 1 : 0.45 }} />
          </div>
        </div>
      ))}
    </Panel>
  );
}

function AdvanceFig() {
  return (
    <Panel label="advance / INV-3001">
      <div className="flex items-baseline gap-3">
        <span className="nums display text-[clamp(40px,5vw,64px)]">+$2,850</span>
        <span className="text-[12px] uppercase tracking-[0.12em] text-text-faint">to you, now</span>
      </div>
      <div className="mt-5">
        <Row><span className="text-[13px] text-text-dim">Invoice face value</span><span className="nums text-[13px]">$3,000</span></Row>
        <Row><span className="text-[13px] text-text-dim">Factoring fee (5%)</span><span className="nums text-[13px]">-$150</span></Row>
        <Row><span className="text-[13px] text-text-dim">Credit proof</span><span className="nums text-[13px] text-text">verified · 98 ≥ 65</span></Row>
        <Row last><span className="text-[13px] text-text-dim">Pool recovers on funding</span><span className="nums text-[13px]">$3,000</span></Row>
      </div>
      <div className="nums mt-4 truncate text-[11px] text-text-faint">tx 0x9f3a…c41 · arbitrum sepolia</div>
    </Panel>
  );
}

function SettleFig() {
  return (
    <Panel label="settlement / receipt">
      <Row><span className="text-[13px] text-text-dim">Received</span><span className="nums text-[13px]">3,000.00 USDC</span></Row>
      <Row><span className="text-[13px] text-text-dim">Held in MXNe</span><span className="nums text-[13px]">30,816 MXN</span></Row>
      <Row><span className="text-[13px] text-text-dim">To bank · SPEI</span><span className="nums text-[13px] text-text">20,544 MXN</span></Row>
      <Row><span className="text-[13px] text-text-dim">FX rate</span><span className="nums text-[13px]">17.12 MXN/USD</span></Row>
      <Row last><span className="text-[13px] text-text-dim">Tax document</span><span className="nums text-[13px]">CFDI-3001-204815</span></Row>
      <div className="nums mt-4 truncate text-[11px] text-text-faint">filed automatically · no accountant</div>
    </Panel>
  );
}

const FIGS = [ChaseFig, GraphFig, AdvanceFig, SettleFig];

/* ---- the sticky-stack ---- */

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
        gsap.to(panel.querySelector(".chapter-inner"), {
          scale: 0.92,
          opacity: 0.4,
          filter: "blur(3px)",
          ease: "none",
          scrollTrigger: { trigger: panels[i + 1], start: "top bottom", end: "top top", scrub: true },
        });
        gsap.to(panel.querySelector(".chapter-fig"), {
          yPercent: -12,
          ease: "none",
          scrollTrigger: { trigger: panel, start: "top top", end: "bottom top", scrub: true },
        });
      });
      // figure entrance — clip + rise as each chapter arrives
      panels.forEach((panel) => {
        const fig = panel.querySelector(".chapter-fig > *");
        if (!fig) return;
        gsap.from(fig, {
          yPercent: 10,
          opacity: 0,
          filter: "blur(8px)",
          clipPath: "inset(0 0 100% 0)",
          duration: 1.1,
          ease: "expo.out",
          scrollTrigger: { trigger: panel, start: "top 65%", once: true },
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
      {CHAPTERS.map((c, i) => {
        const Fig = FIGS[i];
        return (
          <section
            key={c.n}
            className="chapter"
            style={{ background: c.tint, zIndex: i + 1, ...(c.dark ? LIGHT_VARS : {}) }}
          >
            <div className="chapter-inner shell relative grid w-full grid-cols-1 items-center gap-12 py-24 lg:grid-cols-[1fr_1fr]">
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
                <h2 className="display mt-7 text-[clamp(34px,5.5vw,76px)]">{c.title}</h2>
                <p className="mt-7 max-w-[44ch] text-[clamp(15px,1.4vw,19px)] leading-relaxed text-text-dim">
                  {c.body}
                </p>
              </div>

              <div className="chapter-fig lg:pl-6">
                <Fig />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
