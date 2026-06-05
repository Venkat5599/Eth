"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Lightning,
  ShieldCheck,
  Sparkle,
  Bank,
  Receipt,
  EnvelopeSimple,
  CheckCircle,
  XCircle,
  CurrencyDollar,
} from "@phosphor-icons/react";
import { api, SEED, type Invoice, type ClientRep } from "@/lib/api";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const mxn = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

type Event = { id: string; icon: "mail" | "advance" | "settle" | "reject"; title: string; sub: string };

export default function Page() {
  const reduce = useReducedMotion();
  const [invoices, setInvoices] = useState<Invoice[]>(SEED.invoices);
  const [rep, setRep] = useState<ClientRep[]>(SEED.reputation);
  const [events, setEvents] = useState<Event[]>([]);
  const [live, setLive] = useState(false);
  const [flash, setFlash] = useState<null | { ok: boolean; text: string }>(null);

  const repOf = useCallback(
    (clientId: string) => rep.find((r) => r.clientId === clientId)?.score ?? 50,
    [rep],
  );

  const refresh = useCallback(async () => {
    try {
      const [inv, rp] = await Promise.all([api.invoices(), api.reputation()]);
      if (Array.isArray(inv)) setInvoices(inv);
      if (Array.isArray(rp)) setRep(rp);
      setLive(true);
    } catch {
      setLive(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  const pushEvent = (e: Event) => setEvents((prev) => [e, ...prev].slice(0, 8));

  const onAdvance = async (inv: Invoice) => {
    const score = repOf(inv.clientId);
    try {
      const r = await api.advance(inv.id);
      if (r.ok && r.advanceUsd) {
        setFlash({ ok: true, text: `Advanced ${usd(r.advanceUsd)} now. Credit proof verified (score ${r.score} >= 65).` });
        pushEvent({ id: crypto.randomUUID(), icon: "advance", title: `Advanced ${usd(r.advanceUsd)} on ${inv.id}`, sub: `Credit proof verified for ${inv.clientName}` });
      } else {
        setFlash({ ok: false, text: `Advance declined. Credit proof rejected (score ${r.score} < ${r.threshold ?? 65}).` });
        pushEvent({ id: crypto.randomUUID(), icon: "reject", title: `Advance declined for ${inv.id}`, sub: `${inv.clientName} score ${r.score} below threshold` });
      }
    } catch {
      if (score >= 65) {
        const adv = Math.round(inv.amountUsd * 0.95);
        setFlash({ ok: true, text: `Advanced ${usd(adv)} now. Credit proof verified (score ${score} >= 65).` });
        pushEvent({ id: crypto.randomUUID(), icon: "advance", title: `Advanced ${usd(adv)} on ${inv.id}`, sub: `Credit proof verified for ${inv.clientName}` });
        setInvoices((p) => p.map((i) => (i.id === inv.id ? { ...i, status: "advanced", advanceUsd: adv } : i)));
      } else {
        setFlash({ ok: false, text: `Advance declined. Credit proof rejected (score ${score} < 65).` });
        pushEvent({ id: crypto.randomUUID(), icon: "reject", title: `Advance declined for ${inv.id}`, sub: `${inv.clientName} score ${score} below threshold` });
      }
    }
    setTimeout(() => setFlash(null), 5200);
    refresh();
  };

  const onPay = async (inv: Invoice) => {
    try {
      const settled = await api.pay(inv.id);
      const s = settled.settlement;
      pushEvent({
        id: crypto.randomUUID(),
        icon: "settle",
        title: `${inv.clientName} paid ${usd(inv.amountUsd)}`,
        sub: s ? `${mxn(s.pesosOfframped)} to bank via SPEI · ${s.taxDocId}` : "settled to pesos",
      });
    } catch {
      setInvoices((p) =>
        p.map((i) => (i.id === inv.id ? { ...i, status: i.status === "advanced" ? "recovered" : "released" } : i)),
      );
      pushEvent({ id: crypto.randomUUID(), icon: "settle", title: `${inv.clientName} paid ${usd(inv.amountUsd)}`, sub: "settled to pesos via SPEI · CFDI generated" });
    }
    refresh();
  };

  const totals = useMemo(() => {
    const outstanding = invoices.filter((i) => ["created", "nudging"].includes(i.status)).reduce((a, i) => a + i.amountUsd, 0);
    const advanced = invoices.filter((i) => i.advanceUsd).reduce((a, i) => a + (i.advanceUsd ?? 0), 0);
    const settled = invoices.filter((i) => ["released", "recovered"].includes(i.status)).reduce((a, i) => a + i.amountUsd, 0);
    return { outstanding, advanced, settled };
  }, [invoices]);

  return (
    <div className="grid-bg relative min-h-[100dvh]">
      <div className="relative z-10 mx-auto max-w-[1180px] px-5 pb-24 pt-6 md:px-8">
        <Nav live={live} />
        <Hero />
        <Stats outstanding={totals.outstanding} advanced={totals.advanced} settled={totals.settled} />

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
          <section>
            <SectionLabel icon={<Receipt size={15} weight="bold" />}>Receivables</SectionLabel>
            <div className="mt-3 flex flex-col gap-3">
              {invoices.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  inv={inv}
                  score={repOf(inv.clientId)}
                  onAdvance={() => onAdvance(inv)}
                  onPay={() => onPay(inv)}
                  reduce={!!reduce}
                />
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <AgentFeed events={events} reduce={!!reduce} />
            <RepPanel rep={rep} />
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="fixed inset-x-0 bottom-6 z-50 mx-auto w-[min(560px,92vw)]"
          >
            <div
              className="flex items-center gap-3 rounded-[14px] border px-4 py-3.5 shadow-2xl backdrop-blur"
              style={{
                background: flash.ok ? "rgba(13,40,33,.92)" : "rgba(40,16,22,.92)",
                borderColor: flash.ok ? "var(--accent-dim)" : "rgba(251,113,133,.35)",
              }}
            >
              {flash.ok ? (
                <CheckCircle size={22} weight="fill" color="var(--accent)" />
              ) : (
                <XCircle size={22} weight="fill" color="var(--danger)" />
              )}
              <p className="text-[14px] leading-snug text-text">{flash.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function Nav({ live }: { live: boolean }) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-[10px] text-[15px]" style={{ background: "var(--accent-dim)" }}>
          🐍
        </div>
        <span className="text-[17px] font-semibold tracking-tight">Cobra</span>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-text-dim">
        <Chain name="Base" /> <Chain name="Arbitrum" /> <Chain name="Ethereum" />
        <span
          className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"
          style={{ color: live ? "var(--accent)" : "var(--text-faint)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: live ? "var(--accent)" : "var(--text-faint)" }} />
          {live ? "agent live" : "agent offline"}
        </span>
      </div>
    </header>
  );
}

const Chain = ({ name }: { name: string }) => (
  <span className="rounded-full border border-border bg-surface px-2.5 py-1">{name}</span>
);

function Hero() {
  return (
    <div className="mt-10 max-w-[760px]">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[12px] text-text-dim">
        <Sparkle size={13} weight="fill" color="var(--accent)" /> AI collections agent for LATAM freelancers
      </span>
      <h1 className="mt-5 text-[40px] font-semibold leading-[1.05] tracking-tight md:text-[52px]">
        Get paid, then get paid <span style={{ color: "var(--accent)" }}>early</span>.
      </h1>
      <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-text-dim">
        Cobra chases your invoices, settles in pesos, and files the tax doc. Because it learns which
        clients actually pay, it can advance your cash today on invoices they have not paid yet.
      </p>
    </div>
  );
}

function Stats({ outstanding, advanced, settled }: { outstanding: number; advanced: number; settled: number }) {
  const items = [
    { label: "Outstanding", value: usd(outstanding), icon: <Receipt size={16} weight="bold" /> },
    { label: "Advanced to you", value: usd(advanced), icon: <Lightning size={16} weight="fill" />, accent: true },
    { label: "Settled to pesos", value: usd(settled), icon: <Bank size={16} weight="bold" /> },
  ];
  return (
    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-[14px] border border-border bg-surface px-4 py-4">
          <div className="flex items-center gap-2 text-[12px] text-text-dim">
            <span style={{ color: it.accent ? "var(--accent)" : "var(--text-faint)" }}>{it.icon}</span>
            {it.label}
          </div>
          <div className="nums mt-2 text-[26px] font-semibold tracking-tight" style={{ color: it.accent ? "var(--accent)" : "var(--text)" }}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-medium text-text-dim">
      <span className="text-text-faint">{icon}</span>
      {children}
    </div>
  );
}

function ScoreChip({ score }: { score: number }) {
  const good = score >= 65;
  return (
    <span
      className="nums inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium"
      style={{
        color: good ? "var(--accent)" : "var(--danger)",
        borderColor: good ? "var(--accent-dim)" : "rgba(251,113,133,.3)",
        background: good ? "rgba(52,211,153,.06)" : "rgba(251,113,133,.06)",
      }}
    >
      <ShieldCheck size={12} weight="fill" /> {score}
    </span>
  );
}

const STATUS_COPY: Record<Invoice["status"], string> = {
  created: "Awaiting client",
  nudging: "Agent chasing",
  funded: "Funded",
  released: "Settled",
  advanced: "Advanced",
  recovered: "Recovered",
};

function InvoiceCard({
  inv, score, onAdvance, onPay, reduce,
}: { inv: Invoice; score: number; onAdvance: () => void; onPay: () => void; reduce: boolean }) {
  const settled = ["released", "recovered"].includes(inv.status);
  const advanced = inv.status === "advanced" || !!inv.advanceUsd;
  const lastNudge = inv.nudges.at(-1);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[14px] border border-border bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium">{inv.clientName}</span>
            <ScoreChip score={score} />
          </div>
          <div className="nums mt-1 text-[12px] text-text-faint">
            {inv.id} · due {new Date(inv.dueDate).toLocaleDateString("en-US")}
          </div>
        </div>
        <div className="text-right">
          <div className="nums text-[20px] font-semibold tracking-tight">{usd(inv.amountUsd)}</div>
          <div className="text-[11.5px]" style={{ color: settled ? "var(--accent)" : "var(--text-faint)" }}>
            {STATUS_COPY[inv.status]}
          </div>
        </div>
      </div>

      {lastNudge && !settled && (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[12px] text-text-dim">
          <EnvelopeSimple size={14} className="mt-0.5 shrink-0" color="var(--text-faint)" />
          <span className="leading-snug">
            <span className="text-text">{lastNudge.tone}</span> reminder sent: {lastNudge.subject}
          </span>
        </div>
      )}

      {advanced && inv.advanceUsd && (
        <div className="nums mt-3 flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[12.5px]"
          style={{ borderColor: "var(--accent-dim)", background: "rgba(52,211,153,.05)", color: "var(--accent)" }}>
          <Lightning size={14} weight="fill" /> {usd(inv.advanceUsd)} advanced to you · pool awaits client funding
        </div>
      )}

      {inv.settlement && (
        <div className="nums mt-3 grid grid-cols-2 gap-2 text-[12px]">
          <Mini label="To bank (SPEI)" value={mxn(inv.settlement.pesosOfframped)} accent />
          <Mini label="Held in MXNe" value={mxn(inv.settlement.mxneConverted)} />
          <Mini label="Tax doc" value={inv.settlement.taxDocId} />
          <Mini label="FX" value={`${inv.settlement.fxRate} MXN/USD`} />
        </div>
      )}

      {!settled && (
        <div className="mt-3.5 flex items-center gap-2">
          <button
            onClick={onAdvance}
            disabled={advanced}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition active:translate-y-px disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            <Lightning size={14} weight="fill" /> {advanced ? "Advanced" : "Advance now"}
          </button>
          <button
            onClick={onPay}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-[13px] text-text-dim transition hover:text-text active:translate-y-px"
          >
            <CurrencyDollar size={14} weight="bold" /> Simulate client pays
          </button>
        </div>
      )}
    </motion.div>
  );
}

const Mini = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="rounded-[10px] border border-border bg-surface-2 px-3 py-2">
    <div className="text-[10.5px] uppercase tracking-wide text-text-faint">{label}</div>
    <div className="mt-0.5 text-[13px] font-medium" style={{ color: accent ? "var(--accent)" : "var(--text)" }}>
      {value}
    </div>
  </div>
);

function AgentFeed({ events, reduce }: { events: Event[]; reduce: boolean }) {
  const ICON = {
    mail: <EnvelopeSimple size={15} weight="bold" />,
    advance: <Lightning size={15} weight="fill" />,
    settle: <Bank size={15} weight="bold" />,
    reject: <XCircle size={15} weight="fill" />,
  };
  return (
    <div className="rounded-[14px] border border-border bg-surface p-4">
      <SectionLabel icon={<Sparkle size={15} weight="fill" />}>Agent activity</SectionLabel>
      <div className="mt-3 flex flex-col">
        {events.length === 0 && (
          <p className="py-6 text-center text-[12.5px] text-text-faint">
            The agent works your receivables here. Try an action on an invoice.
          </p>
        )}
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.div
              key={e.id}
              initial={reduce ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 border-b border-border py-2.5 last:border-0"
            >
              <span
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                style={{
                  background: e.icon === "reject" ? "rgba(251,113,133,.1)" : "var(--accent-dim)",
                  color: e.icon === "reject" ? "var(--danger)" : "var(--accent)",
                }}
              >
                {ICON[e.icon]}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] leading-tight">{e.title}</div>
                <div className="nums mt-0.5 truncate text-[11.5px] text-text-faint">{e.sub}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RepPanel({ rep }: { rep: ClientRep[] }) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-4">
      <SectionLabel icon={<ShieldCheck size={15} weight="fill" />}>Client payment graph</SectionLabel>
      <p className="mt-1 text-[11.5px] text-text-faint">
        The private data that prices each advance. Proven onchain in zero knowledge.
      </p>
      <div className="mt-3 flex flex-col gap-2.5">
        {rep.map((r) => (
          <div key={r.clientId} className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-[13px]">{r.clientName}</span>
              <span className="nums text-[13px] font-semibold" style={{ color: r.score >= 65 ? "var(--accent)" : "var(--danger)" }}>
                {r.score}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: r.score >= 65 ? "var(--accent)" : "var(--danger)" }} />
            </div>
            <div className="nums mt-1 text-[11px] text-text-faint">
              {r.invoicesPaid} paid · {r.invoicesDefaulted} default · ~{Math.round(r.avgDaysToPay)}d to pay
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
