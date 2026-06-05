// Cobra autonomous collections agent.
//
// Two things run here:
//   1. A background loop that works overdue receivables — drafts a nudge (Claude),
//      sends it, escalates tone over time. This is the "agent never sleeps" part.
//   2. A small HTTP API the app calls to create invoices, request a factoring advance
//      (gated by the client reputation score), and settle when the client pays.
//
// Money decisions are explicit and rule-bound. The LLM only writes the nudge text.

import { store } from "./store";
import { draftNudge } from "./llm";
import { sendNudge, settle } from "./rails";
import { chain, chainEnabled } from "./chain";
import type { Invoice } from "./types";

const POLL = Number(process.env.AGENT_POLL_SECONDS ?? 20) * 1000;
const ADVANCE_FEE_BPS = 500;      // 5% factoring fee
const ADVANCE_MIN_SCORE = 65;     // client must clear this to qualify
const NUDGE_INTERVAL_MS = 15_000; // demo cadence; real build is daily

function overdue(inv: Invoice) {
  return Date.now() > new Date(inv.dueDate).getTime();
}

function lastNudgeAge(inv: Invoice) {
  if (inv.nudges.length === 0) return Infinity;
  return Date.now() - new Date(inv.nudges.at(-1)!.at).getTime();
}

// ---- the autonomous loop ----
async function tick() {
  for (const inv of store.all()) {
    const chaseable = inv.status === "created" || inv.status === "nudging";
    if (!chaseable) continue;
    if (!overdue(inv)) continue;
    if (lastNudgeAge(inv) < NUDGE_INTERVAL_MS) continue;

    console.log(`[agent] working invoice ${inv.id} (${inv.clientName}, $${inv.amountUsd})`);
    const draft = await draftNudge(inv);
    const sent = await sendNudge(inv, draft);
    inv.nudges.push(sent);
    inv.status = "nudging";
    store.upsert(inv);
  }
}

// ---- settlement when a client funds the escrow ----
async function onClientPaid(inv: Invoice) {
  const created = new Date(inv.createdAt).getTime();
  const days = Math.max(1, Math.round((Date.now() - created) / 86_400_000));

  const settlement = await settle(inv, inv.amountUsd);
  // real on-chain release when wired
  if (chainEnabled && inv.onchainId) {
    try {
      const r = await chain.release(BigInt(inv.onchainId));
      if (r) {
        settlement.txHash = r.url;
        console.log(`[chain] released invoice ${inv.id} · ${r.url}`);
      }
    } catch (e) {
      console.log(`[chain] release failed: ${(e as Error).message}`);
    }
  }
  inv.settlement = settlement;
  // if previously advanced, the pool is repaid and the invoice is "recovered"
  inv.status = inv.status === "advanced" ? "recovered" : "released";
  store.upsert(inv);
  const rep = store.recordOutcome(inv.clientId, inv.clientName, true, days);
  console.log(`[agent] ${inv.clientName} paid. client score -> ${rep.score}`);
  return inv;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

const server = Bun.serve({
  port: 8787,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;
    if (req.method === "OPTIONS")
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });

    if (pathname === "/invoices" && req.method === "GET") return json(store.all());
    if (pathname === "/reputation" && req.method === "GET") return json(store.allReputation());

    if (pathname === "/invoices" && req.method === "POST") {
      const b = await req.json();
      const inv: Invoice = {
        id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        freelancer: b.freelancer ?? "0xFreelancer",
        clientName: b.clientName,
        clientEmail: b.clientEmail ?? "client@example.com",
        clientId: b.clientId ?? b.clientName?.toLowerCase().replace(/\s+/g, "-"),
        amountUsd: Number(b.amountUsd),
        dueDate: b.dueDate ?? new Date(Date.now() - 1000).toISOString(), // overdue now (demo)
        status: "created",
        createdAt: new Date().toISOString(),
        nudges: [],
      };
      // real on-chain escrow when the chain is wired (VPS)
      if (chainEnabled) {
        try {
          const due = Math.floor(new Date(inv.dueDate).getTime() / 1000);
          const r = await chain.createInvoice(inv.freelancer as `0x${string}`, inv.amountUsd, due);
          if (r) {
            inv.onchainId = r.id.toString();
            inv.onchainTx = r.url;
            console.log(`[chain] invoice ${inv.id} on-chain id ${inv.onchainId} · ${r.url}`);
          }
        } catch (e) {
          console.log(`[chain] create_invoice failed: ${(e as Error).message}`);
        }
      }
      store.upsert(inv);
      return json(inv, 201);
    }

    // request a factoring advance — gated by the client reputation score
    const adv = pathname.match(/^\/invoices\/([^/]+)\/advance$/);
    if (adv && req.method === "POST") {
      const inv = store.get(adv[1]);
      if (!inv) return json({ error: "not found" }, 404);
      const rep = store.reputation(inv.clientId);
      const score = rep?.score ?? 50;
      if (score < ADVANCE_MIN_SCORE)
        return json(
          { error: "credit proof would fail", score, threshold: ADVANCE_MIN_SCORE },
          402,
        );
      const fee = (inv.amountUsd * ADVANCE_FEE_BPS) / 10_000;
      inv.advanceUsd = Math.round((inv.amountUsd - fee) * 100) / 100;
      inv.status = "advanced";
      store.upsert(inv);
      return json({ ok: true, advanceUsd: inv.advanceUsd, score, fee });
    }

    // simulate the client funding the escrow -> settle
    const pay = pathname.match(/^\/invoices\/([^/]+)\/pay$/);
    if (pay && req.method === "POST") {
      const inv = store.get(pay[1]);
      if (!inv) return json({ error: "not found" }, 404);
      const settled = await onClientPaid(inv);
      return json(settled);
    }

    return json({ error: "not found" }, 404);
  },
});

console.log(`🐍 Cobra agent live on :${server.port} — collections loop every ${POLL / 1000}s`);
setInterval(tick, POLL);
tick();
