// Seed the demo: two clients with history (one great payer, one shaky) plus a fresh
// invoice for each. The great payer's score clears the advance gate; the shaky one
// does not — that contrast is the live demo's punchline.

import { store } from "./store";
import type { Invoice } from "./types";

// build reputation history
for (let i = 0; i < 6; i++) store.recordOutcome("acme-robotics", "Acme Robotics", true, 4);
for (let i = 0; i < 2; i++) store.recordOutcome("nimbus-labs", "Nimbus Labs", true, 38);
store.recordOutcome("nimbus-labs", "Nimbus Labs", false, 0);

const mk = (over: Partial<Invoice>): Invoice => ({
  id: over.id!,
  freelancer: "0xFreelancer",
  clientName: over.clientName!,
  clientEmail: over.clientEmail!,
  clientId: over.clientId!,
  amountUsd: over.amountUsd!,
  dueDate: new Date(Date.now() - 2000).toISOString(),
  status: "created",
  createdAt: new Date().toISOString(),
  nudges: [],
});

store.upsert(
  mk({
    id: "INV-3001",
    clientName: "Acme Robotics",
    clientEmail: "ap@acme-robotics.com",
    clientId: "acme-robotics",
    amountUsd: 3000,
  }),
);
store.upsert(
  mk({
    id: "INV-3002",
    clientName: "Nimbus Labs",
    clientEmail: "billing@nimbus-labs.io",
    clientId: "nimbus-labs",
    amountUsd: 1800,
  }),
);

console.log("seeded. Acme score:", store.reputation("acme-robotics")?.score);
console.log("seeded. Nimbus score:", store.reputation("nimbus-labs")?.score);
