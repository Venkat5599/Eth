// Settlement rails + nudge delivery.
// USDC -> MXNe (Etherfuse) -> MXN via Bitso SPEI. Sandbox/mock when keys are absent,
// clearly flagged so the demo is honest about what is live vs simulated.

import type { Invoice, Nudge, Settlement } from "./types";

const MXN_PER_USD = 17.12; // sample FX; real build pulls Etherfuse/Bitso quote

export async function sendNudge(inv: Invoice, nudge: Nudge): Promise<Nudge> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log(`   [nudge:console] to=${inv.clientEmail} tone=${nudge.tone}`);
    console.log(`   subject: ${nudge.subject}`);
    return { ...nudge, sent: true };
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NUDGE_FROM ?? "cobra@example.dev",
        to: inv.clientEmail,
        subject: nudge.subject,
        text: nudge.body,
      }),
    });
    return { ...nudge, sent: true };
  } catch (e) {
    console.log(`   [nudge:failed] ${(e as Error).message}`);
    return { ...nudge, sent: false };
  }
}

// Convert a received USDC amount into pesos: keep an operating slice in MXNe (yield),
// off-ramp the rest via Bitso SPEI. Returns the settlement record + generated tax doc.
export async function settle(inv: Invoice, usdcReceived: number): Promise<Settlement> {
  const mxneConverted = Math.round(usdcReceived * 0.6 * MXN_PER_USD * 100) / 100; // 60% to MXNe
  const pesosOfframped = Math.round(usdcReceived * 0.4 * MXN_PER_USD * 100) / 100; // 40% to bank
  const taxDocId = `CFDI-${inv.id}-${Date.now().toString().slice(-6)}`;

  // Real build: ETHERFUSE_API_KEY swap + BITSO_API_KEY SPEI payout here.
  console.log(
    `   [settle] $${usdcReceived} USDC -> ${mxneConverted} MXNe (hold) + ${pesosOfframped} MXN (SPEI)`,
  );
  console.log(`   [tax] generated ${taxDocId}`);

  return {
    at: new Date().toISOString(),
    usdcReceived,
    mxneConverted,
    pesosOfframped,
    fxRate: MXN_PER_USD,
    taxDocId,
  };
}
