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
    kicker: "Propose",
    title: "Anyone with a stake can ask for funds.",
    body: "A member opens a grant proposal: who gets paid, how much, and why. It lands on-chain the moment they sign — no gatekeeper, no form to a foundation.",
    tint: "#0c0d10",
  },
  {
    n: "02",
    kicker: "Vote",
    title: "The crowd decides, weighted by its stake.",
    body: "Members vote for or against within the window. Each vote counts as much as the power they hold. One member, one ballot per proposal.",
    tint: "#101216",
  },
  {
    n: "03",
    kicker: "Quorum",
    title: "Passing takes a majority and a turnout.",
    body: "A proposal clears only when the FOR votes beat AGAINST and reach the minimum quorum. The bar lives in the contract — nobody can lower it.",
    tint: "#15171c",
  },
  {
    n: "04",
    kicker: "Execute",
    title: "The treasury pays. No human in the loop.",
    body: "Once voting closes, anyone can execute a passed proposal. The contract sends the grant straight from the treasury. No admin key, no countersignature.",
    tint: "#0a0d12",
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

function ProposeFig() {
  return (
    <Panel label="dao / propose #7">
      <Row><span className="text-[13px] text-text-dim">Recipient</span><span className="nums text-[13px] text-text">0x9c…A4e2</span></Row>
      <Row><span className="text-[13px] text-text-dim">Amount</span><span className="nums text-[13px]">0.50 ETH</span></Row>
      <Row><span className="text-[13px] text-text-dim">For</span><span className="text-[13px]">Community docs translation</span></Row>
      <Row last><span className="text-[13px] text-text-dim">Proposer</span><span className="nums text-[13px]">member · 5 votes</span></Row>
      <div className="nums mt-4 truncate text-[11px] text-text-faint">emitted ProposalCreated · arbitrum sepolia</div>
    </Panel>
  );
}

function VoteFig() {
  const voters = [
    ["0x4Bb…ce7", "FOR", 5],
    ["0x9c1…A4e2", "FOR", 3],
    ["0x77d…0b51", "AGAINST", 2],
    ["0xae2…9250", "FOR", 4],
  ] as const;
  return (
    <Panel label="dao / votes #7">
      {voters.map(([who, side, w], i) => (
        <Row key={who} last={i === voters.length - 1}>
          <span className="nums text-[13px] text-text-dim">{who}</span>
          <span className="flex items-center gap-3">
            <span className="text-[12px] uppercase tracking-[0.1em]" style={{ color: side === "FOR" ? "var(--text)" : "var(--text-faint)" }}>{side}</span>
            <span className="nums text-[13px]">×{w}</span>
          </span>
        </Row>
      ))}
    </Panel>
  );
}

function QuorumFig() {
  return (
    <Panel label="dao / tally #7">
      <div className="flex items-baseline gap-3">
        <span className="nums display text-[clamp(40px,5vw,64px)]">12 — 2</span>
        <span className="text-[12px] uppercase tracking-[0.12em] text-text-faint">for / against</span>
      </div>
      <div className="mt-5">
        <Row><span className="text-[13px] text-text-dim">Quorum required</span><span className="nums text-[13px]">3</span></Row>
        <Row><span className="text-[13px] text-text-dim">FOR votes</span><span className="nums text-[13px] text-text">12 ≥ 3 ✓</span></Row>
        <Row><span className="text-[13px] text-text-dim">Majority</span><span className="nums text-[13px] text-text">12 &gt; 2 ✓</span></Row>
        <Row last><span className="text-[13px] text-text-dim">Status</span><span className="nums text-[13px] text-text">passed</span></Row>
      </div>
      <div className="nums mt-4 truncate text-[11px] text-text-faint">enforced in the contract · not by an admin</div>
    </Panel>
  );
}

function ExecuteFig() {
  return (
    <Panel label="dao / execute #7">
      <div className="flex items-baseline gap-3">
        <span className="nums display text-[clamp(40px,5vw,64px)]">−0.50 ETH</span>
        <span className="text-[12px] uppercase tracking-[0.12em] text-text-faint">treasury → grantee</span>
      </div>
      <div className="mt-5">
        <Row><span className="text-[13px] text-text-dim">Paid to</span><span className="nums text-[13px]">0x9c…A4e2</span></Row>
        <Row><span className="text-[13px] text-text-dim">Triggered by</span><span className="nums text-[13px]">anyone</span></Row>
        <Row last><span className="text-[13px] text-text-dim">Treasury after</span><span className="nums text-[13px] text-text">balance − grant</span></Row>
      </div>
      <div className="nums mt-4 truncate text-[11px] text-text-faint">emitted Executed · transfer_eth on-chain</div>
    </Panel>
  );
}

const FIGS = [ProposeFig, VoteFig, QuorumFig, ExecuteFig];

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
