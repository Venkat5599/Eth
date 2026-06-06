"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, Check, X, SealCheck } from "@phosphor-icons/react";
import { SplitReveal, Counter, Rise } from "@/components/landing/Reveal";
import { Chapters } from "@/components/landing/Chapters";
import { Marquee } from "@/components/landing/Marquee";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { Magnetic } from "@/components/landing/Magnetic";
import { CodeStream } from "@/components/landing/CodeStream";
import { Intro } from "@/components/landing/Intro";
import { Cursor } from "@/components/landing/Cursor";
import { ShaderBg } from "@/components/landing/ShaderBg";
import { HorizontalPan } from "@/components/landing/HorizontalPan";
import { ScrollFill } from "@/components/landing/ScrollFill";

export default function Landing() {
  return (
    <main className="relative">
      <Intro />
      <Cursor />
      <SmoothScroll />
      <ScrollProgress />
      <Nav />
      <Hero />
      <div className="skewable">
        <Marquee text="Propose · Vote · Execute" />
      </div>
      <CodeSection />
      <section className="shell relative py-[14vw]">
        <span className="text-[11px] uppercase tracking-[0.24em] text-text-faint">[ The thesis ]</span>
        <div className="mt-8">
          <ScrollFill text="A treasury nobody controls alone. The vote is the only key to the money." />
        </div>
      </section>
      <div id="chapters">
        <Chapters />
      </div>
      <HorizontalPan />
      <Compare />
      <Testimonials />
      <CtaFooter />
    </main>
  );
}

/* ---------------- nav ---------------- */
function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="group relative text-[13px] uppercase tracking-[0.12em] text-text-dim transition-colors hover:text-text">
      {children}
      <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-text transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
    </Link>
  );
}

function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-500"
      style={{
        background: solid ? "color-mix(in srgb, var(--bg) 78%, transparent)" : "transparent",
        backdropFilter: solid ? "blur(10px)" : "none",
        borderBottom: `1px solid ${solid ? "var(--border)" : "transparent"}`,
      }}
    >
      <div className="shell flex h-[68px] items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center text-[14px] font-bold" style={{ background: "#0d0b07", color: "var(--bg)" }}>
            ◆
          </span>
          <span className="text-[15px] font-semibold uppercase tracking-[0.1em]">Grants DAO</span>
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          <NavLink href="#chapters">How it works</NavLink>
          <NavLink href="#compare">Why on-chain</NavLink>
          <NavLink href="#reviews">What&apos;s real</NavLink>
          <NavLink href="/dao">Live DAO</NavLink>
        </nav>
        <Magnetic strength={0.5}>
          <Link
            href="/dao"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.1em] transition-colors"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            Open DAO <ArrowRight size={13} weight="bold" />
          </Link>
        </Magnetic>
      </div>
    </header>
  );
}

/* ---------------- hero ---------------- */
function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="grid-bg relative flex min-h-[100dvh] flex-col justify-between overflow-hidden pb-10 pt-[68px]">
      <div className="absolute inset-0 z-0"><ShaderBg /></div>
      {/* editorial meta bar */}
      <Rise className="shell relative z-10 mt-8 flex items-center justify-between border-b border-border pb-4 text-[11px] uppercase tracking-[0.24em] text-text-faint">
        <span>[ ON-CHAIN GOVERNANCE ]</span>
        <span className="hidden sm:block">Arbitrum Stylus · no backend</span>
        <span>2026 / EDITION 01</span>
      </Rise>

      {/* giant headline */}
      <div className="shell relative z-10">
        <h1 className="display text-[clamp(56px,12.5vw,184px)]">
          <SplitReveal as="span" text="Fund what" className="block" />
          <SplitReveal as="span" text="the crowd" className="block" delay={0.08} />
          <span className="block">
            <SplitReveal as="span" text="backs." className="outline-word" delay={0.16} />
          </span>
        </h1>
        <motion.div
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 h-px w-full origin-left bg-border-strong"
        />
      </div>

      {/* bottom split: copy + stats */}
      <div className="shell relative z-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <Rise delay={0.2} className="max-w-[44ch]">
          <p className="text-[clamp(15px,1.45vw,20px)] leading-relaxed text-text-dim">
            A fully on-chain grants treasury on Arbitrum Stylus. Members propose, the community
            votes by weight, and the contract pays out — no admin keys on the money.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-6">
            <Magnetic strength={0.4}>
              <Link
                href="/dao"
                className="group inline-flex items-center gap-2.5 px-6 py-3.5 text-[13px] font-medium uppercase tracking-[0.1em] transition-colors"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                Enter the DAO
                <ArrowRight size={15} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <div className="flex items-center gap-2 text-[12px] text-text-dim">
              <SealCheck size={14} weight="fill" />
              <span className="nums">Live on Arbitrum Sepolia · testnet</span>
            </div>
          </div>
        </Rise>

        <div className="flex flex-col border-t border-border lg:min-w-[360px]">
          <StatRow value={100} suffix="%" label="on-chain — no backend, no admin keys" />
          <StatRow value={0} suffix="" label="trust required to move the treasury" />
          <StatRow value={1} suffix="" label="vote = the only key to the money" last />
        </div>
      </div>
    </section>
  );
}

function StatRow({ value, suffix, label, last }: { value: number; suffix: string; label: string; last?: boolean }) {
  return (
    <Rise className={`flex items-baseline justify-between gap-6 py-4 ${last ? "" : "border-b border-border"}`}>
      <Counter to={value} suffix={suffix} className="nums display text-[clamp(34px,3.4vw,52px)]" />
      <span className="max-w-[20ch] text-right text-[12px] uppercase tracking-[0.08em] text-text-dim">{label}</span>
    </Rise>
  );
}

/* ---------------- code section ---------------- */
const MODULES = [
  ["dao::propose", "Any member opens a grant: recipient, amount, reason."],
  ["dao::vote", "For or against, weighted by your voting power. One vote each."],
  ["dao::quorum", "Passes only on majority and minimum turnout."],
  ["dao::execute", "Voting closes, anyone triggers the payout. The chain sends it."],
];
function CodeSection() {
  return (
    <section className="relative border-y border-border py-[12vw]">
      <div className="shell grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <span className="text-[11px] uppercase tracking-[0.24em] text-text-faint">[ Under the hood ]</span>
          <h2 className="display mt-6 text-[clamp(34px,5.5vw,76px)]">
            <SplitReveal text="No hype." className="block" />
            <SplitReveal text="Real contracts." className="block" delay={0.08} />
          </h2>
          <p className="mt-7 max-w-[40ch] text-[15px] leading-relaxed text-text-dim">
            One Stylus contract (Rust→WASM) holds the treasury and the rules. Proposals, votes,
            and payouts are all on-chain. No server sits between you and the money.
          </p>
          <ul className="mt-10 flex flex-col">
            {MODULES.map(([m, d], i) => (
              <Rise key={m} delay={i * 0.05}>
                <li className="grid grid-cols-[auto_1fr] items-baseline gap-5 border-t border-border py-4 last:border-b">
                  <span className="nums text-[13px] text-text">{m}</span>
                  <span className="text-[13px] text-text-dim">{d}</span>
                </li>
              </Rise>
            ))}
          </ul>
        </div>
        <Rise y={36} className="h-[560px] overflow-hidden rounded-[6px] border border-border bg-[var(--surface)]">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full border border-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full border border-border-strong" />
            <span className="h-2.5 w-2.5 rounded-full border border-border-strong" />
            <span className="nums ml-3 text-[11px] uppercase tracking-[0.18em] text-text-faint">grants-dao / contract</span>
          </div>
          <div className="h-[calc(560px-49px)]">
            <CodeStream />
          </div>
        </Rise>
      </div>
    </section>
  );
}

/* ---------------- compare ---------------- */
const ROWS = [
  "Treasury moves only by member vote",
  "No admin can drain the funds",
  "Every proposal and tally is public on-chain",
  "Quorum + majority enforced by code",
  "Anyone can execute a passed grant",
  "No backend, no custodian, no trust",
];
function Compare() {
  return (
    <section id="compare" className="relative py-[14vw]">
      <div className="shell">
        <div className="mb-16 flex items-end justify-between gap-6 border-b border-border-strong pb-6">
          <h2 className="display skewable max-w-[12ch] text-[clamp(38px,7vw,104px)]">
            <SplitReveal text="A multisig does" className="block" />
            <SplitReveal text="none of this." className="block" delay={0.08} />
          </h2>
          <div className="hidden gap-12 pb-3 text-[11px] uppercase tracking-[0.2em] text-text-faint md:flex">
            <span>Multisig / admin</span>
            <span className="text-text">Grants DAO</span>
          </div>
        </div>

        <div>
          {ROWS.map((row, i) => (
            <Rise key={row} start="top 92%">
              <div className="group grid grid-cols-[1fr_auto_auto] items-center gap-x-10 border-b border-border py-6 transition-colors hover:bg-[rgba(243,241,234,.03)]">
                <span className="text-[clamp(16px,2vw,26px)]">
                  <span className="nums mr-4 text-text-faint">{String(i + 1).padStart(2, "0")}</span>
                  {row}
                </span>
                <span className="grid w-14 place-items-center"><X size={20} weight="bold" color="var(--text-faint)" /></span>
                <span className="grid w-14 place-items-center"><Check size={22} weight="bold" color="var(--text)" /></span>
              </div>
            </Rise>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- what's real (honest transparency) ---------------- */
const REALITY = [
  {
    t: "Live on-chain",
    d: "One Stylus contract on Arbitrum Sepolia holds the treasury and the rules. Proposals, votes, quorum, and payouts all execute on-chain — verifiable on Arbiscan.",
  },
  {
    t: "No backend",
    d: "The frontend reads state from a public RPC and writes through your own wallet. Nothing runs on a server — there's no API to trust or take down.",
  },
  {
    t: "Non-custodial",
    d: "No admin key can move the treasury. Funds leave only when a proposal clears majority and quorum, then anyone may trigger the payout.",
  },
];
function Testimonials() {
  return (
    <section id="reviews" className="relative border-t border-border py-[14vw]">
      <div className="shell">
        <div className="mb-16 flex items-end justify-between gap-6">
          <h2 className="display skewable max-w-[16ch] text-[clamp(38px,7vw,104px)]">
            <SplitReveal text="No mockups." className="block" />
            <SplitReveal text="Here's what's real." className="block" delay={0.08} />
          </h2>
          <span className="nums hidden pb-3 text-[12px] text-text-dim md:block">Testnet · honest by default</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3">
          {REALITY.map((t, i) => (
            <Rise key={t.t} delay={i * 0.08}>
              <figure className="flex h-full flex-col justify-between gap-10 border-t border-border-strong p-7 md:border-l md:border-t-0 md:first:border-l-0">
                <SealCheck size={20} weight="fill" />
                <blockquote className="text-[clamp(16px,1.5vw,20px)] leading-snug">{t.d}</blockquote>
                <figcaption className="text-[12px] font-medium uppercase tracking-[0.06em]">{t.t}</figcaption>
              </figure>
            </Rise>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- cta footer ---------------- */
function CtaFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border-strong py-[16vw]">
      <div className="shell relative z-10">
        <h2 className="display skewable text-[clamp(56px,15vw,240px)]">
          <SplitReveal text="Govern it." />
        </h2>
        <div className="mt-12 flex flex-wrap items-end justify-between gap-8 border-t border-border pt-8">
          <Magnetic strength={0.4}>
            <Link
              href="/dao"
              className="group inline-flex items-center gap-2.5 px-7 py-4 text-[14px] font-medium uppercase tracking-[0.1em] transition-colors"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              Enter the live DAO
              <ArrowUpRight size={17} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Magnetic>
          <p className="nums text-[11px] uppercase tracking-[0.2em] text-text-faint">
            Grants DAO — Arbitrum Stylus / ETH México 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
