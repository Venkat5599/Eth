"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, Check, X, Star, SealCheck } from "@phosphor-icons/react";
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
        <Marquee text="Get paid early" />
      </div>
      <CodeSection />
      <section className="shell relative py-[14vw]">
        <span className="text-[11px] uppercase tracking-[0.24em] text-text-faint">[ The thesis ]</span>
        <div className="mt-8">
          <ScrollFill text="The bottleneck was never the payment. It was knowing who actually pays." />
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
            C
          </span>
          <span className="text-[15px] font-semibold uppercase tracking-[0.1em]">Cobra</span>
        </Link>
        <nav className="hidden items-center gap-9 md:flex">
          <NavLink href="#chapters">How it works</NavLink>
          <NavLink href="#compare">Why Cobra</NavLink>
          <NavLink href="#reviews">Reviews</NavLink>
          <NavLink href="/dashboard">Live demo</NavLink>
        </nav>
        <Magnetic strength={0.5}>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.1em] transition-colors"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            Open Cobra <ArrowRight size={13} weight="bold" />
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
        <span>[ ART + TECH ]</span>
        <span className="hidden sm:block">Iced invoices, served early</span>
        <span>2026 / EDITION 01</span>
      </Rise>

      {/* giant headline */}
      <div className="shell relative z-10">
        <h1 className="display text-[clamp(56px,12.5vw,184px)]">
          <SplitReveal as="span" text="Get paid," className="block" />
          <SplitReveal as="span" text="then paid" className="block" delay={0.08} />
          <span className="block">
            <SplitReveal as="span" text="early." className="outline-word" delay={0.16} />
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
            Cobra chases your invoices, settles in pesos, files the tax doc, and advances your cash
            today because it knows which clients pay.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-6">
            <Magnetic strength={0.4}>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2.5 px-6 py-3.5 text-[13px] font-medium uppercase tracking-[0.1em] transition-colors"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                See it work
                <ArrowRight size={15} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <div className="flex items-center gap-2 text-[12px] text-text-dim">
              <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} weight="fill" />)}</div>
              <span className="nums">3,158 paid early</span>
            </div>
          </div>
        </Rise>

        <div className="flex flex-col border-t border-border lg:min-w-[360px]">
          <StatRow value={95} suffix="%" label="of the invoice, advanced instantly" />
          <StatRow value={0} suffix="" label="invoices you chase yourself" />
          <StatRow value={3} suffix="" label="chains — Base, Arbitrum, Ethereum" last />
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
  ["cobra::collections", "The agent chases. The contract holds the money."],
  ["cobra::advance", "Cash today, gated by a zero-knowledge credit proof."],
  ["cobra::credit", "Prove a client pays. Reveal nothing else."],
  ["cobra::settle", "USDC to MXNe to pesos. The tax doc, generated."],
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
            Cobra runs on Stylus contracts and a Circom credit circuit. The agent writes the
            language. The chain enforces the money. This is the actual logic, streaming live.
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
            <span className="nums ml-3 text-[11px] uppercase tracking-[0.18em] text-text-faint">cobra / contracts</span>
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
  "Chases the client for you",
  "Advances cash before the client pays",
  "Settles straight to pesos via SPEI",
  "Generates the tax document",
  "Under 1% FX, not 5 to 10%",
  "Knows which clients actually pay",
];
function Compare() {
  return (
    <section id="compare" className="relative py-[14vw]">
      <div className="shell">
        <div className="mb-16 flex items-end justify-between gap-6 border-b border-border-strong pb-6">
          <h2 className="display skewable max-w-[12ch] text-[clamp(38px,7vw,104px)]">
            <SplitReveal text="The bank does" className="block" />
            <SplitReveal text="none of this." className="block" delay={0.08} />
          </h2>
          <div className="hidden gap-12 pb-3 text-[11px] uppercase tracking-[0.2em] text-text-faint md:flex">
            <span>Bank / PayPal</span>
            <span className="text-text">Cobra</span>
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

/* ---------------- testimonials ---------------- */
const QUOTES = [
  { q: "It collected an invoice my client had ignored for six weeks. I did nothing.", n: "Mariana Olvera", r: "Brand designer, CDMX" },
  { q: "Advanced on a 3k invoice the same morning I sent it. That is the whole pitch.", n: "Diego Fuentes", r: "Full-stack dev, Guadalajara" },
  { q: "The tax doc alone is worth it. My accountant used to charge me for this.", n: "Valentina Rojas", r: "Motion designer, Bogota" },
];
function Testimonials() {
  return (
    <section id="reviews" className="relative border-t border-border py-[14vw]">
      <div className="shell">
        <div className="mb-16 flex items-end justify-between gap-6">
          <h2 className="display skewable max-w-[16ch] text-[clamp(38px,7vw,104px)]">
            <SplitReveal text="Do not take" className="block" />
            <SplitReveal text="our word for it." className="block" delay={0.08} />
          </h2>
          <span className="nums hidden pb-3 text-[12px] text-text-dim md:block">4.8 / 5 — 3,158 reviews</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3">
          {QUOTES.map((t, i) => (
            <Rise key={t.n} delay={i * 0.08}>
              <figure className="flex h-full flex-col justify-between gap-10 border-t border-border-strong p-7 md:border-l md:border-t-0 md:first:border-l-0">
                <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, s) => <Star key={s} size={13} weight="fill" />)}</div>
                <blockquote className="text-[clamp(17px,1.7vw,23px)] leading-snug">{t.q}</blockquote>
                <figcaption className="flex items-center justify-between text-[12px] uppercase tracking-[0.06em]">
                  <span>
                    <span className="font-medium">{t.n}</span>
                    <span className="ml-2 text-text-faint">{t.r}</span>
                  </span>
                  <SealCheck size={15} weight="fill" />
                </figcaption>
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
          <SplitReveal text="Cobra it." />
        </h2>
        <div className="mt-12 flex flex-wrap items-end justify-between gap-8 border-t border-border pt-8">
          <Magnetic strength={0.4}>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2.5 px-7 py-4 text-[14px] font-medium uppercase tracking-[0.1em] transition-colors"
              style={{ background: "var(--text)", color: "var(--bg)" }}
            >
              Open the live demo
              <ArrowUpRight size={17} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Magnetic>
          <p className="nums text-[11px] uppercase tracking-[0.2em] text-text-faint">
            Cobra — ETH Mexico 2026 / Arbitrum Open House London
          </p>
        </div>
      </div>
    </footer>
  );
}
