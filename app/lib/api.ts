// Thin client for the Cobra agent (Bun server on :8787).
// Every call degrades gracefully: if the agent is offline, the UI falls back to
// seed data so the page always renders during a demo.

export type InvoiceStatus =
  | "created" | "nudging" | "funded" | "released" | "advanced" | "recovered";

export interface Nudge {
  at: string; channel: string; tone: "friendly" | "firm" | "final";
  subject: string; body: string; sent: boolean;
}
export interface Settlement {
  at: string; usdcReceived: number; mxneConverted: number;
  pesosOfframped: number; fxRate: number; taxDocId: string; txHash?: string;
}
export interface Invoice {
  id: string; freelancer: string; clientName: string; clientEmail: string;
  clientId: string; amountUsd: number; dueDate: string; status: InvoiceStatus;
  createdAt: string; nudges: Nudge[]; advanceUsd?: number; advanceTx?: string; settlement?: Settlement;
}
export interface ClientRep {
  clientId: string; clientName: string; invoicesPaid: number;
  invoicesDefaulted: number; avgDaysToPay: number; score: number;
}

const BASE = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8787";

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok && r.status !== 402) throw new Error(`${r.status}`);
  return r.json();
}

export const api = {
  invoices: () => j<Invoice[]>("/invoices"),
  reputation: () => j<ClientRep[]>("/reputation"),
  pay: (id: string) => j<Invoice>(`/invoices/${id}/pay`, { method: "POST" }),
  advance: (id: string) =>
    j<{ ok?: boolean; advanceUsd?: number; score: number; fee?: number; threshold?: number; error?: string }>(
      `/invoices/${id}/advance`,
      { method: "POST" },
    ),
  create: (b: { clientName: string; amountUsd: number; clientEmail?: string }) =>
    j<Invoice>("/invoices", { method: "POST", body: JSON.stringify(b) }),
};

// seed fallback (agent offline)
export const SEED: { invoices: Invoice[]; reputation: ClientRep[] } = {
  reputation: [
    { clientId: "acme-robotics", clientName: "Acme Robotics", invoicesPaid: 6, invoicesDefaulted: 0, avgDaysToPay: 4, score: 88 },
    { clientId: "nimbus-labs", clientName: "Nimbus Labs", invoicesPaid: 2, invoicesDefaulted: 1, avgDaysToPay: 38, score: 49 },
  ],
  invoices: [
    { id: "INV-3001", freelancer: "0xFreelancer", clientName: "Acme Robotics", clientEmail: "ap@acme-robotics.com", clientId: "acme-robotics", amountUsd: 3000, dueDate: new Date(Date.now() - 2000).toISOString(), status: "created", createdAt: new Date().toISOString(), nudges: [] },
    { id: "INV-3002", freelancer: "0xFreelancer", clientName: "Nimbus Labs", clientEmail: "billing@nimbus-labs.io", clientId: "nimbus-labs", amountUsd: 1800, dueDate: new Date(Date.now() - 2000).toISOString(), status: "created", createdAt: new Date().toISOString(), nudges: [] },
  ],
};
