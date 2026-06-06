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
  Plus,
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

  const onCreate = async (b: { clientName: string; amountUsd: number; clientEmail?: string }) => {
    try {
      const inv = await api.create(b);
      pushEvent({
        id: crypto.randomUUID(),
        icon: "mail",
        title: `Invoice raised for ${b.clientName}`,
        sub: `${usd(b.amountUsd)} · agent will start chasing it`,
      });
      setInvoices((p) => [inv, ...p.filter((i) => i.id !== inv.id)]);
    } catch {
      setFlash({ ok: false, text: "Agent offline — start it to raise live invoices." });
      setTimeout(() => setFlash(null), 4200);
    }
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
            <NewInvoice onCreate={onCreate} />
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
    <header className="flex items-center justify-between border-b border-border pb-5">
      <a href="/" className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 place-items-center rounded-[11px] text-[15px] font-bold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          C
        </span>
        <div className="leading-none">
          <div className="text-[16px] font-semibold tracking-tight">Cobra</div>
          <div className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-text-faint">Collections agent</div>
        </div>
      </a>
      <div className="flex items-center gap-2 text-[12px] text-text-dim">
        <Chain name="Base" /> <Chain name="Arbitrum" /> <Chain name="Ethereum" />
        <span
          className="ml-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
          style={{
            color: live ? "var(--accent)" : "var(--text-faint)",
            borderColor: live ? "var(--accent-dim)" : "var(--border)",
            background: live ? "rgba(52,211,153,.06)" : "transparent",
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--accent)" }} />}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: live ? "var(--accent)" : "var(--text-faint)" }} />
          </span>
          {live ? "agent live" : "agent offline"}
        </span>
      </div>
    </header>
  );
}

const Chain = ({ name }: { name: string }) => (
  <span className="hidden rounded-full border border-border bg-surface px-2.5 py-1 sm:inline">{name}</span>
);

function Hero() {
  return (
    <div className="mt-12 max-w-[820px]">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11.5px] uppercase tracking-[0.14em] text-text-dim">
        <Sparkle size={12} weight="fill" color="var(--accent)" /> Autonomous · non-custodial · on-chain
      </span>
      <h1 className="display mt-6 text-[clamp(40px,7vw,76px)] leading-[0.98]">
        Get paid, then paid <span style={{ color: "var(--accent)" }}>early</span>.
      </h1>
      <p className="mt-5 max-w-[60ch] text-[15px] leading-relaxed text-text-dim">
        The agent chases every invoice, settles to pesos, and files the tax doc. It learns which
        clients actually pay — so it can front your cash <span className="text-text">today</span> on
        invoices they haven&apos;t paid yet, gated by an on-chain credit proof.
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
    <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="relative overflow-hidden rounded-[16px] border px-5 py-5"
          style={{
            borderColor: it.accent ? "var(--accent-dim)" : "var(--border)",
            background: it.accent
              ? "linear-gradient(160deg, rgba(52,211,153,.10), rgba(52,211,153,.02))"
              : "var(--surface)",
          }}
        >
          {it.accent && (
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: "rgba(52,211,153,.18)" }} />
          )}
          <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-[0.1em] text-text-dim">
            <span style={{ color: it.accent ? "var(--accent)" : "var(--text-faint)" }}>{it.icon}</span>
            {it.label}
          </div>
          <div
            className="nums display mt-3 text-[clamp(30px,3.6vw,42px)] leading-none"
            style={{ color: it.accent ? "var(--accent)" : "var(--text)" }}
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function NewInvoice({
  onCreate,
}: {
  onCreate: (b: { clientName: string; amountUsd: number; clientEmail?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");

  const submit = () => {
    const amt = Number(amount);
    if (!clientName.trim() || !amt) return;
    onCreate({ clientName: clientName.trim(), amountUsd: amt, clientEmail: email.trim() || undefined });
    setClientName(""); setAmount(""); setEmail(""); setOpen(false);
  };

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-border-strong py-3 text-[13px] text-text-dim transition hover:text-text"
      >
        <Plus size={15} weight="bold" /> Raise an invoice
      </button>
    );

  return (
    <div className="mt-3 rounded-[14px] border border-border bg-surface p-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1.4fr_1fr]">
        <input
          autoFocus
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Client name"
          className="rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-border-strong"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="Amount (USD)"
          className="nums rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-border-strong"
        />
      </div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Client email (optional)"
        className="mt-2.5 w-full rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-border-strong"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition active:translate-y-px"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          <Plus size={14} weight="bold" /> Raise invoice
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-full border border-border-strong px-3.5 py-2 text-[13px] text-text-dim transition hover:text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.14em] text-text-dim">
      <span style={{ color: "var(--accent)" }}>{icon}</span>
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

  const statusAccent = settled || advanced;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-[18px] border bg-surface p-5 transition-colors"
      style={{ borderColor: advanced ? "var(--accent-dim)" : "var(--border)" }}
    >
      {advanced && <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: "var(--accent)" }} />}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[16px] font-semibold tracking-tight">{inv.clientName}</span>
            <ScoreChip score={score} />
          </div>
          <div className="nums mt-1.5 text-[12px] text-text-faint">
            {inv.id} · due {new Date(inv.dueDate).toLocaleDateString("en-US")}
          </div>
        </div>
        <div className="text-right">
          <div className="nums display text-[28px] leading-none">{usd(inv.amountUsd)}</div>
          <span
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] uppercase tracking-[0.08em]"
            style={{
              color: statusAccent ? "var(--accent)" : "var(--text-faint)",
              borderColor: statusAccent ? "var(--accent-dim)" : "var(--border)",
            }}
          >
            {STATUS_COPY[inv.status]}
          </span>
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
        <div className="mt-4 rounded-[12px] border px-4 py-3"
          style={{ borderColor: "var(--accent-dim)", background: "linear-gradient(160deg, rgba(52,211,153,.10), rgba(52,211,153,.02))" }}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--accent)" }}>
              <Lightning size={13} weight="fill" /> Advanced to your wallet
            </span>
            <span className="nums display text-[22px] leading-none" style={{ color: "var(--accent)" }}>{usd(inv.advanceUsd)}</span>
          </div>
          <div className="mt-1.5 text-[11.5px] text-text-faint">
            Paid now · pool repays when the client funds the escrow{inv.advanceTx ? " · " : ""}
            {inv.advanceTx && <a href={inv.advanceTx} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--accent)" }}>view tx ↗</a>}
          </div>
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
        <div className="mt-4 flex items-center gap-2.5">
          <button
            onClick={onAdvance}
            disabled={advanced}
            className="group/btn inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition active:translate-y-px disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            <Lightning size={15} weight="fill" />
            {advanced ? "Advanced" : `Advance ${usd(Math.round(inv.amountUsd * 0.95))} now`}
          </button>
          <button
            onClick={onPay}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-4 py-2.5 text-[13px] text-text-dim transition hover:border-text-faint hover:text-text active:translate-y-px"
          >
            <CurrencyDollar size={14} weight="bold" /> Client pays
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
