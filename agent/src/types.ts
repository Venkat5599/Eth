// Shared types for the Cobra collections agent.

export type InvoiceStatus =
  | "created"     // raised, awaiting client
  | "nudging"     // agent is actively chasing
  | "funded"      // client paid into escrow
  | "released"    // settled to freelancer
  | "advanced"    // freelancer took a factoring advance; pool awaits client funding
  | "recovered";  // client funded after advance; pool repaid

export interface Invoice {
  id: string;
  freelancer: string;       // wallet
  clientName: string;
  clientEmail: string;
  clientId: string;         // stable id used by the reputation graph
  amountUsd: number;
  dueDate: string;          // ISO
  status: InvoiceStatus;
  createdAt: string;
  nudges: Nudge[];
  advanceUsd?: number;      // amount advanced to the freelancer
  advanceTx?: string;       // arbiscan url for the request_advance tx (zk-gated), when on-chain
  settlement?: Settlement;
  onchainId?: string;       // on-chain invoice id (Arbitrum Sepolia), when chain is enabled
  onchainTx?: string;       // arbiscan url for the create_invoice tx
}

export interface Nudge {
  at: string;
  channel: "email";
  tone: "friendly" | "firm" | "final";
  subject: string;
  body: string;
  sent: boolean;
}

export interface Settlement {
  at: string;
  usdcReceived: number;
  mxneConverted: number;    // portion swapped to peso stablecoin
  pesosOfframped: number;   // MXN delivered via Bitso SPEI
  fxRate: number;           // MXN per USD
  taxDocId: string;         // generated CFDI / monthly-report id
  txHash?: string;
  speiRef?: string;         // Bitso SPEI withdrawal reference (when rails live)
}

// Client payment reputation — the proprietary graph that powers advances.
export interface ClientRep {
  clientId: string;
  clientName: string;
  invoicesPaid: number;
  invoicesDefaulted: number;
  avgDaysToPay: number;
  score: number;            // 0..100
}
