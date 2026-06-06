// x402 pay-in: the client settles an invoice in USDC over HTTP 402.
//
// Flow (per the x402 standard):
//   1. Client POSTs /invoices/:id/payin with no payment -> 402 + payment requirements.
//   2. Client pays USDC (Base) and retries with an `X-PAYMENT` header.
//   3. We verify (via the configured facilitator, or accept in mock when none is set),
//      then the invoice is funded and settlement proceeds.
//
// This is the USDC pay-in leg of the README: x402-native, on Base Sepolia.

import type { Invoice } from "./types";

const FACILITATOR = process.env.X402_FACILITATOR_URL ?? "";
const PAY_TO = process.env.X402_PAY_TO ?? "0x0000000000000000000000000000000000000000";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Circle test USDC

export interface PaymentRequirements {
  x402Version: number;
  accepts: Array<{
    scheme: "exact";
    network: "base-sepolia";
    asset: string;
    payTo: string;
    maxAmountRequired: string; // USDC, 6 decimals
    resource: string;
    description: string;
  }>;
}

// The 402 body a client uses to know exactly what to pay.
export function paymentRequired(inv: Invoice): PaymentRequirements {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "base-sepolia",
        asset: USDC_BASE_SEPOLIA,
        payTo: PAY_TO,
        maxAmountRequired: String(Math.round(inv.amountUsd * 1_000_000)), // 6dp
        resource: `/invoices/${inv.id}/payin`,
        description: `Settle invoice ${inv.id} (${inv.clientName})`,
      },
    ],
  };
}

// Verify the X-PAYMENT header. With a facilitator we call its /verify; without one we accept
// in mock mode so the demo's pay-in path is exercisable end to end.
export async function verifyPayment(header: string, inv: Invoice): Promise<boolean> {
  if (!header) return false;
  if (!FACILITATOR) {
    console.log(`   [x402] mock-accept payment for ${inv.id} (no facilitator configured)`);
    return true;
  }
  try {
    const res = await fetch(`${FACILITATOR}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment: header,
        requirements: paymentRequired(inv).accepts[0],
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.isValid ?? data?.valid);
  } catch (e) {
    console.log(`   [x402] verify failed: ${(e as Error).message}`);
    return false;
  }
}
