"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bank, Plus, ThumbsUp, ThumbsDown, CheckCircle, XCircle, Lightning,
  Wallet, ShieldCheck, ArrowUpRight, Clock,
} from "@phosphor-icons/react";
import {
  connect, getStats, getProposals, powerOf, tx, fmtEth, short,
  DAO_ADDRESS, type Proposal,
} from "@/lib/dao";

const ARBISCAN = "https://sepolia.arbiscan.io/address/" + DAO_ADDRESS;

export default function DaoPage() {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [power, setPower] = useState<bigint>(0n);
  const [stats, setStats] = useState<{ treasury: bigint; count: number; totalPower: bigint; quorum: bigint; owner: `0x${string}` } | null>(null);
  const [props, setProps] = useState<Proposal[]>([]);
  const [flash, setFlash] = useState<null | { ok: boolean; text: string }>(null);
  const [busy, setBusy] = useState(false);

  const note = (ok: boolean, text: string) => { setFlash({ ok, text }); setTimeout(() => setFlash(null), 5000); };

  const refresh = useCallback(async () => {
    try {
      const s = await getStats();
      setStats(s);
      const all = await getProposals(s.count);
      // Hide closed proposals that never drew a single vote — they're noise, not decisions.
      const now = Math.floor(Date.now() / 1000);
      setProps(all.filter((p) => p.votesFor + p.votesAgainst > 0n || now <= p.deadline || p.executed));
      if (account) setPower(await powerOf(account));
    } catch { /* contract not set yet */ }
  }, [account]);

  useEffect(() => { refresh(); const t = setInterval(refresh, 8000); return () => clearInterval(t); }, [refresh]);

  const onConnect = async () => {
    const a = await connect();
    if (!a) return note(false, "No wallet found — install MetaMask");
    setAccount(a);
    note(true, "Wallet connected");
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    if (!account) return note(false, "Connect your wallet first");
    setBusy(true);
    try { await fn(); note(true, ok); await refresh(); }
    catch (e: any) { note(false, (e?.shortMessage || e?.message || "tx failed").slice(0, 90)); }
    finally { setBusy(false); }
  };

  const isOwner = !!account && !!stats && account.toLowerCase() === stats.owner.toLowerCase();

  return (
    <main className="grid-bg relative min-h-[100dvh]">
      <div className="relative z-10 mx-auto max-w-[1100px] px-5 pb-28 pt-6 md:px-8">
        <Nav account={account} power={power} onConnect={onConnect} />
        <Hero />
        {stats && <Stats stats={stats} />}

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section>
            <Label icon={<Bank size={14} weight="bold" />}>Grant proposals</Label>
            <div className="mt-4 flex flex-col gap-3">
              {props.length === 0 && (
                <div className="rounded-[16px] border border-dashed border-border-strong py-14 text-center text-[13px] text-text-faint">
                  No proposals yet. {power > 0n ? "Create the first grant." : "Connect a member wallet to propose."}
                </div>
              )}
              {props.map((p) => (
                <ProposalCard
                  key={p.id} p={p} quorum={stats?.quorum ?? 0n} canVote={power > 0n} busy={busy}
                  onVote={(s) => run(() => tx.vote(account!, p.id, s), `Voted ${s ? "for" : "against"} #${p.id}`)}
                  onExec={() => run(() => tx.execute(account!, p.id), `Executed #${p.id} — grant paid`)}
                />
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <NewProposal disabled={!account || power === 0n} busy={busy}
              onPropose={(r, e, d) => run(() => tx.propose(account!, r as `0x${string}`, e, d), "Proposal created")} />
            <Treasury busy={busy} connected={!!account}
              onDeposit={(e) => run(() => tx.deposit(account!, e), `Deposited ${e} ETH to treasury`)} />
            {isOwner && <OwnerPanel busy={busy}
              onGrant={(m, amt) => run(() => tx.grantPower(account!, m as `0x${string}`, amt), "Voting power granted")} />}
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="fixed inset-x-0 bottom-6 z-50 mx-auto w-[min(540px,92vw)]"
          >
            <div className="flex items-center gap-3 rounded-[14px] border px-4 py-3.5 shadow-2xl backdrop-blur"
              style={{ background: flash.ok ? "rgba(13,40,33,.92)" : "rgba(40,16,22,.92)", borderColor: flash.ok ? "var(--accent-dim)" : "rgba(251,113,133,.35)" }}>
              {flash.ok ? <CheckCircle size={22} weight="fill" color="var(--accent)" /> : <XCircle size={22} weight="fill" color="var(--danger)" />}
              <p className="text-[14px] leading-snug text-text">{flash.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ---------------- pieces ---------------- */
function Nav({ account, power, onConnect }: { account: string | null; power: bigint; onConnect: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-border pb-5">
      <a href="/" className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-[11px] text-[15px] font-bold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>◆</span>
        <div className="leading-none">
          <div className="text-[16px] font-semibold tracking-tight">Grants DAO</div>
          <div className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-text-faint">On-chain · Arbitrum Stylus</div>
        </div>
      </a>
      {account ? (
        <div className="flex items-center gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-text-dim">
            <ShieldCheck size={13} weight="fill" color="var(--accent)" /> {power.toString()} votes
          </span>
          <span className="nums inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1" style={{ borderColor: "var(--accent-dim)", background: "rgba(52,211,153,.06)", color: "var(--accent)" }}>
            <Wallet size={13} weight="fill" /> {short(account)}
          </span>
        </div>
      ) : (
        <button onClick={onConnect} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold" style={{ background: "var(--text)", color: "var(--bg)" }}>
          <Wallet size={15} weight="fill" /> Connect wallet
        </button>
      )}
    </header>
  );
}

function Hero() {
  return (
    <div className="mt-12 max-w-[760px]">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11.5px] uppercase tracking-[0.14em] text-text-dim">
        <Lightning size={12} weight="fill" color="var(--accent)" /> Members propose · vote · the treasury pays
      </span>
      <h1 className="display mt-6 text-[clamp(38px,6.5vw,68px)] leading-[0.98]">Fund what the<br />community <span style={{ color: "var(--accent)" }}>backs</span>.</h1>
      <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed text-text-dim">
        A fully on-chain grants treasury on Arbitrum Stylus. No backend, no admin keys on the money —
        proposals pass by weighted vote and quorum, then anyone can execute the payout.
        <a href={ARBISCAN} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 underline" style={{ color: "var(--accent)" }}>contract ↗</a>
      </p>
    </div>
  );
}

function Stats({ stats }: { stats: { treasury: bigint; count: number; totalPower: bigint; quorum: bigint } }) {
  const items = [
    { label: "Treasury", value: `${fmtEth(stats.treasury)} ETH`, icon: <Bank size={16} weight="bold" />, accent: true },
    { label: "Proposals", value: String(stats.count), icon: <Plus size={16} weight="bold" /> },
    { label: "Total voting power", value: stats.totalPower.toString(), icon: <ShieldCheck size={16} weight="fill" /> },
    { label: "Quorum", value: stats.quorum.toString(), icon: <CheckCircle size={16} weight="bold" /> },
  ];
  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="relative overflow-hidden rounded-[16px] border px-4 py-4"
          style={{ borderColor: it.accent ? "var(--accent-dim)" : "var(--border)", background: it.accent ? "linear-gradient(160deg,rgba(52,211,153,.10),rgba(52,211,153,.02))" : "var(--surface)" }}>
          {it.accent && <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl" style={{ background: "rgba(52,211,153,.18)" }} />}
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-text-dim">
            <span style={{ color: it.accent ? "var(--accent)" : "var(--text-faint)" }}>{it.icon}</span>{it.label}
          </div>
          <div className="nums display mt-2.5 text-[clamp(22px,2.6vw,30px)] leading-none" style={{ color: it.accent ? "var(--accent)" : "var(--text)" }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function Label({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.14em] text-text-dim"><span style={{ color: "var(--accent)" }}>{icon}</span>{children}</div>;
}

function ProposalCard({ p, quorum, canVote, busy, onVote, onExec }: {
  p: Proposal; quorum: bigint; canVote: boolean; busy: boolean; onVote: (s: boolean) => void; onExec: () => void;
}) {
  const now = Math.floor(Date.now() / 1000);
  const open = now <= p.deadline && !p.executed;
  const total = p.votesFor + p.votesAgainst;
  const forPct = total > 0n ? Number((p.votesFor * 100n) / total) : 0;
  const passed = p.votesFor > p.votesAgainst && p.votesFor >= quorum;
  const status = p.executed ? "Executed" : open ? "Voting open" : passed ? "Passed — executable" : "Rejected";
  const accent = p.executed || passed;
  const mins = Math.max(0, Math.round((p.deadline - now) / 60));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-[18px] border bg-surface p-5" style={{ borderColor: accent ? "var(--accent-dim)" : "var(--border)" }}>
      {accent && <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: "var(--accent)" }} />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold">Grant #{p.id}</span>
            <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]"
              style={{ color: accent ? "var(--accent)" : open ? "var(--text)" : "var(--danger)", borderColor: accent ? "var(--accent-dim)" : "var(--border)" }}>{status}</span>
          </div>
          <div className="nums mt-1.5 text-[12px] text-text-faint">to {short(p.recipient)} · by {short(p.proposer)}{open && <> · <Clock size={11} className="inline" /> {mins}m left</>}</div>
        </div>
        <div className="nums display text-right text-[26px] leading-none">{fmtEth(p.amount)}<span className="ml-1 text-[13px] text-text-faint">ETH</span></div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-[11.5px] text-text-faint"><span className="nums">For {p.votesFor.toString()}</span><span className="nums">Against {p.votesAgainst.toString()}</span></div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${forPct}%`, background: "var(--accent)" }} />
        </div>
        <div className="nums mt-1 text-[10.5px] text-text-faint">quorum {quorum.toString()}</div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {open && canVote && (
          <>
            <button disabled={busy} onClick={() => onVote(true)} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold disabled:opacity-40" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><ThumbsUp size={14} weight="fill" /> For</button>
            <button disabled={busy} onClick={() => onVote(false)} className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-2 text-[13px] text-text-dim hover:text-text disabled:opacity-40"><ThumbsDown size={14} weight="bold" /> Against</button>
          </>
        )}
        {!open && !p.executed && passed && (
          <button disabled={busy} onClick={onExec} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold disabled:opacity-40" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}><Lightning size={14} weight="fill" /> Execute payout</button>
        )}
        {p.executed && <span className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: "var(--accent)" }}><CheckCircle size={15} weight="fill" /> Grant paid on-chain</span>}
      </div>
    </motion.div>
  );
}

function NewProposal({ disabled, busy, onPropose }: { disabled: boolean; busy: boolean; onPropose: (r: string, e: string, d: string) => void }) {
  const [recipient, setRecipient] = useState(""); const [amount, setAmount] = useState(""); const [desc, setDesc] = useState("");
  const submit = () => { if (!recipient || !amount) return; onPropose(recipient, amount, desc || "Grant"); setRecipient(""); setAmount(""); setDesc(""); };
  return (
    <div className="rounded-[16px] border border-border bg-surface p-4">
      <Label icon={<Plus size={14} weight="bold" />}>New grant proposal</Label>
      <div className="mt-3 flex flex-col gap-2.5">
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient address (0x…)" className="rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-border-strong" />
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Amount (ETH)" className="nums rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-border-strong" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's it for?" className="rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-border-strong" />
        <button disabled={disabled || busy} onClick={submit} className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold disabled:opacity-40" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          <Plus size={14} weight="bold" /> {disabled ? "Members only" : "Submit proposal"}
        </button>
      </div>
    </div>
  );
}

function Treasury({ busy, connected, onDeposit }: { busy: boolean; connected: boolean; onDeposit: (e: string) => void }) {
  const [amt, setAmt] = useState("");
  return (
    <div className="rounded-[16px] border border-border bg-surface p-4">
      <Label icon={<Bank size={14} weight="bold" />}>Fund treasury</Label>
      <p className="mt-2 text-[11.5px] text-text-faint">Anyone can top up the DAO treasury. Approved grants pay out from here.</p>
      <div className="mt-3 flex gap-2">
        <input value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="ETH" className="nums flex-1 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-border-strong" />
        <button disabled={!connected || busy || !amt} onClick={() => { onDeposit(amt); setAmt(""); }} className="rounded-full border border-border-strong px-4 py-2 text-[13px] text-text-dim hover:text-text disabled:opacity-40">Deposit</button>
      </div>
    </div>
  );
}

function OwnerPanel({ busy, onGrant }: { busy: boolean; onGrant: (m: string, amt: string) => void }) {
  const [member, setMember] = useState(""); const [amt, setAmt] = useState("");
  return (
    <div className="rounded-[16px] border p-4" style={{ borderColor: "var(--accent-dim)", background: "rgba(52,211,153,.04)" }}>
      <Label icon={<ShieldCheck size={14} weight="fill" />}>Admin · grant voting power</Label>
      <div className="mt-3 flex flex-col gap-2.5">
        <input value={member} onChange={(e) => setMember(e.target.value)} placeholder="Member address (0x…)" className="rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-border-strong" />
        <div className="flex gap-2">
          <input value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="Votes" className="nums flex-1 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-border-strong" />
          <button disabled={busy || !member || !amt} onClick={() => { onGrant(member, amt); setMember(""); setAmt(""); }} className="rounded-full px-4 py-2 text-[13px] font-semibold disabled:opacity-40" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Grant</button>
        </div>
      </div>
    </div>
  );
}
