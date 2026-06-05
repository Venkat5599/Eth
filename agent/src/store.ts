// Tiny JSON-file store + the client reputation graph.
// Self-contained so the demo runs without a deployed contract or DB.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Invoice, ClientRep } from "./types";

// fileURLToPath handles Windows drive letters correctly (URL.pathname does not).
const DB = fileURLToPath(new URL("../data/state.json", import.meta.url));

interface State {
  invoices: Invoice[];
  reputation: Record<string, ClientRep>;
}

function load(): State {
  if (!existsSync(DB)) return { invoices: [], reputation: {} };
  return JSON.parse(readFileSync(DB, "utf8"));
}

function save(s: State) {
  mkdirSync(dirname(DB), { recursive: true });
  writeFileSync(DB, JSON.stringify(s, null, 2));
}

export const store = {
  all: (): Invoice[] => load().invoices,
  get: (id: string) => load().invoices.find((i) => i.id === id),
  upsert(inv: Invoice) {
    const s = load();
    const idx = s.invoices.findIndex((i) => i.id === inv.id);
    if (idx >= 0) s.invoices[idx] = inv;
    else s.invoices.push(inv);
    save(s);
  },
  reputation: (clientId: string): ClientRep | undefined => load().reputation[clientId],
  allReputation: (): ClientRep[] => Object.values(load().reputation),

  // Update the client graph after a payment outcome. This is the moat: every
  // settled (or defaulted) invoice sharpens the score that prices the next advance.
  recordOutcome(clientId: string, clientName: string, paid: boolean, daysToPay: number) {
    const s = load();
    const r =
      s.reputation[clientId] ??
      { clientId, clientName, invoicesPaid: 0, invoicesDefaulted: 0, avgDaysToPay: 0, score: 50 };

    const totalBefore = r.invoicesPaid + r.invoicesDefaulted;
    if (paid) {
      r.avgDaysToPay = (r.avgDaysToPay * r.invoicesPaid + daysToPay) / (r.invoicesPaid + 1);
      r.invoicesPaid += 1;
    } else {
      r.invoicesDefaulted += 1;
    }
    // score = payment rate weighted, penalised by slow pay. bounded 0..100.
    const total = totalBefore + 1;
    const payRate = r.invoicesPaid / total;
    const speedBonus = Math.max(0, 1 - r.avgDaysToPay / 45); // 45d => no bonus
    r.score = Math.round(Math.min(100, Math.max(0, payRate * 80 + speedBonus * 20)));
    s.reputation[clientId] = r;
    save(s);
    return r;
  },
};
