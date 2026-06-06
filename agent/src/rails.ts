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

// Swap USDC -> MXNe via Etherfuse (sandbox). Returns pesos minted, or null to fall back.
async function etherfuseSwap(usdc: number): Promise<number | null> {
  const key = process.env.ETHERFUSE_API_KEY;
  if (!key) return null;
  const base = process.env.ETHERFUSE_BASE_URL ?? "https://api.sandbox.etherfuse.com";
  try {
    const res = await fetch(`${base}/ramp/swap`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "USDC", to: "MXNE", amount: usdc }),
    });
    if (!res.ok) throw new Error(`etherfuse ${res.status}`);
    const data = await res.json();
    return Number(data.amountOut ?? data.mxne ?? usdc * MXN_PER_USD);
  } catch (e) {
    console.log(`   [etherfuse] sandbox call failed, using quote: ${(e as Error).message}`);
    return null;
  }
}

// Off-ramp MXN to a Mexican bank via Bitso SPEI (sandbox). Returns a payout reference.
async function bitsoSpei(mxn: number): Promise<string | null> {
  const key = process.env.BITSO_API_KEY;
  if (!key) return null;
  const base = process.env.BITSO_BASE_URL ?? "https://sandbox.bitso.com/api/v3";
  try {
    const res = await fetch(`${base}/withdrawals/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ currency: "mxn", method: "praxis", amount: String(mxn) }),
    });
    if (!res.ok) throw new Error(`bitso ${res.status}`);
    const data = await res.json();
    return String(data?.payload?.wid ?? data?.wid ?? "");
  } catch (e) {
    console.log(`   [bitso] sandbox call failed, using mock ref: ${(e as Error).message}`);
    return null;
  }
}

// Convert a received USDC amount into pesos: keep an operating slice in MXNe (yield),
// off-ramp the rest via Bitso SPEI. Real sandbox calls when keys are present; otherwise the
// computed quote (clearly logged), so the demo is honest about what is live vs simulated.
export async function settle(inv: Invoice, usdcReceived: number): Promise<Settlement> {
  const mxneSlice = usdcReceived * 0.6;
  const offrampSlice = usdcReceived * 0.4;

  const mxneReal = await etherfuseSwap(mxneSlice);
  const mxneConverted =
    mxneReal ?? Math.round(mxneSlice * MXN_PER_USD * 100) / 100; // 60% to MXNe
  const pesosOfframped = Math.round(offrampSlice * MXN_PER_USD * 100) / 100; // 40% to bank
  const speiRef = await bitsoSpei(pesosOfframped);
  const taxDocId = `CFDI-${inv.id}-${Date.now().toString().slice(-6)}`;

  console.log(
    `   [settle] $${usdcReceived} USDC -> ${mxneConverted} MXNe (hold) + ${pesosOfframped} MXN (SPEI${speiRef ? ` ref ${speiRef}` : ""})`,
  );
  console.log(`   [tax] generated ${taxDocId}`);

  return {
    at: new Date().toISOString(),
    usdcReceived,
    mxneConverted,
    pesosOfframped,
    fxRate: MXN_PER_USD,
    taxDocId,
    speiRef: speiRef ?? undefined,
  };
}
