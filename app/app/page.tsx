"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Star,
  SealCheck,
  Lightning,
} from "@phosphor-icons/react";
import { SplitReveal, Counter } from "@/components/landing/Reveal";
import { Chapters } from "@/components/landing/Chapters";
import { Marquee } from "@/components/landing/Marquee";

export default function Landing() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <Marquee text="Get paid early" />
      <Chapters />
      <Compare />
      <Testimonials />
      <CtaFooter />
    </main>
  );
}

/* ---------------- nav ---------------- */
function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors"
      style={{
        background: solid ? "rgba(7,9,11,.7)" : "transparent",
        backdropFilter: solid ? "blur(12px)" : "none",
        borderBottom: solid ? "1px solid var(--border)" : "1px solid transparent",
      }}
    >
      <div className="shell flex h-[64px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] text-[15px]" style={{ background: "var(--accent-dim)" }}>
            🐍
          </span>
          <span className="text-[17px] font-semibold tracking-tight">Cobra</span>
        </Link>
        <nav className="hidden items-center gap-7 text-[14px] text-text-dim md:flex">
          <a href="#chapters" className="transition hover:text-text">How it works</a>
          <a href="#compare" className="transition hover:text-text">Why Cobra</a>
          <a href="#reviews" className="transition hover:text-text">Reviews</a>
          <Link href="/dashboard" className="transition hover:text-text">Live demo</Link>
        </nav>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition active:translate-y-px"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Open Cobra <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
    </header>
  );
}

/* ---------------- hero ---------------- */
function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="grid-bg relative grid min-h-[100dvh] place-items-center overflow-hidden pt-24">
      <div className="glow pointer-events-none absolute inset-0" />
      <div className="shell relative z-10 grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[13px] text-text-dim"
          >
            <Lightning size={13} weight="fill" color="var(--accent)" /> AI collections agent for LATAM freelancers
          </motion.span>

          <h1 className="display mt-6 text-[clamp(48px,9vw,116px)]">
            <SplitReveal as="span" text="Get paid," className="block" />
            <span className="block">
              <SplitReveal as="span" text="then get paid" />{" "}
              <span style={{ color: "var(--accent)" }}>
                <SplitReveal as="span" text="early." delay={0.15} />
              </span>
            </span>
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-7 max-w-[52ch] text-[clamp(15px,1.5vw,20px)] leading-relaxed text-text-dim"
          >
            Cobra chases your invoices, settles in pesos, files the tax doc, and advances your cash
            today because it knows which clients pay.
          </motion.p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium transition active:translate-y-px"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              See it work <ArrowRight size={16} weight="bold" />
            </Link>
            <div className="flex items-center gap-2 text-[13px] text-text-dim">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={15} weight="fill" color="var(--accent)" />
                ))}
              </div>
              <span className="nums">3,158 freelancers paid early</span>
            </div>
          </div>
        </div>

        {/* stat stack */}
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <Stat value={95} suffix="%" label="of the invoice, advanced instantly" accent />
          <Stat value={0} suffix="" label="invoices you chase yourself" />
          <Stat value={3} suffix="" label="chains: Base, Arbitrum, Ethereum" />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, suffix, label, accent }: { value: number; suffix: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-[16px] border border-border bg-surface/70 px-5 py-5 backdrop-blur">
      <Counter to={value} suffix={suffix} className="nums display text-[clamp(40px,5vw,64px)]" />
      <p className="mt-1 text-[13px] leading-snug text-text-dim" style={accent ? { color: "var(--accent)" } : undefined}>
        {label}
      </p>
    </div>
  );
}

/* ---------------- compare ---------------- */
const ROWS = [
  "Chases the client for you",
  "Advances cash before the client pays",
  "Settles straight to pesos (SPEI)",
  "Generates the tax document",
  "Under 1% FX, not 5 to 10%",
  "Knows which clients actually pay",
];
function Compare() {
  const reduce = useReducedMotion();
  return (
    <section id="compare" className="relative py-28">
      <div className="shell">
        <h2 className="display max-w-[16ch] text-[clamp(34px,6vw,80px)]">
          The bank does none of this.
        </h2>
        <div className="mt-14 grid grid-cols-[1fr_auto_auto] items-stretch gap-x-6">
          <div />
          <ColHead label="Bank / PayPal" dim />
          <ColHead label="Cobra" />
          {ROWS.map((row, i) => (
            <motion.div
              key={row}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="contents"
            >
              <div className="flex items-center border-t border-border py-5 text-[clamp(15px,1.6vw,20px)]">
                {row}
              </div>
              <div className="grid place-items-center border-t border-border px-6">
                <X size={20} weight="bold" color="var(--text-faint)" />
              </div>
              <div
                className="grid place-items-center border-t px-6"
                style={{ borderColor: "var(--accent-dim)", background: "rgba(52,211,153,.04)" }}
              >
                <Check size={22} weight="bold" color="var(--accent)" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
const ColHead = ({ label, dim }: { label: string; dim?: boolean }) => (
  <div className="grid place-items-center px-6 pb-4 text-[13px] font-medium" style={{ color: dim ? "var(--text-faint)" : "var(--accent)" }}>
    {label}
  </div>
);

/* ---------------- testimonials ---------------- */
const QUOTES = [
  { q: "It collected an invoice my client had ignored for six weeks. I did nothing.", n: "Mariana Olvera", r: "Brand designer, CDMX" },
  { q: "Got advanced on a 3k invoice the same morning I sent it. That is the whole pitch.", n: "Diego Fuentes", r: "Full-stack dev, Guadalajara" },
  { q: "The tax doc alone is worth it. My accountant used to charge me for this.", n: "Valentina Rojas", r: "Motion designer, Bogota" },
];
function Testimonials() {
  const reduce = useReducedMotion();
  return (
    <section id="reviews" className="relative py-28">
      <div className="shell">
        <div className="flex items-end justify-between gap-6">
          <h2 className="display max-w-[14ch] text-[clamp(34px,6vw,80px)]">Do not take our word for it.</h2>
          <div className="hidden items-center gap-1 text-[13px] text-text-dim md:flex">
            <Star size={15} weight="fill" color="var(--accent)" />
            <span className="nums">4.8 average, 3,158 reviews</span>
          </div>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {QUOTES.map((t, i) => (
            <motion.figure
              key={t.n}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="flex flex-col justify-between rounded-[18px] border border-border bg-surface p-6"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} size={15} weight="fill" color="var(--accent)" />
                ))}
              </div>
              <blockquote className="mt-5 text-[clamp(16px,1.6vw,21px)] leading-snug">{t.q}</blockquote>
              <figcaption className="mt-6 flex items-center gap-2 text-[13px]">
                <span className="font-medium">{t.n}</span>
                <span className="text-text-faint">{t.r}</span>
                <SealCheck size={15} weight="fill" color="var(--accent)" className="ml-auto" />
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- cta footer ---------------- */
function CtaFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border py-32">
      <div className="glow pointer-events-none absolute inset-0" />
      <div className="shell relative z-10 text-center">
        <h2 className="display mx-auto max-w-[16ch] text-[clamp(48px,10vw,140px)]">
          Do not just chase it. <span style={{ color: "var(--accent)" }}>Cobra it.</span>
        </h2>
        <Link
          href="/dashboard"
          className="mt-12 inline-flex items-center gap-2 rounded-full px-7 py-4 text-[16px] font-medium transition active:translate-y-px"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Open the live demo <ArrowUpRight size={18} weight="bold" />
        </Link>
        <p className="nums mt-16 text-[12px] text-text-faint">
          Cobra · built for ETH Mexico 2026 and Arbitrum Open House London
        </p>
      </div>
    </footer>
  );
}
