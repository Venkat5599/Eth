# 🐍 Cobra

**The AI that gets LATAM freelancers paid — then pays them early.**

`cobrar` (es.) = *to get paid / to collect.* Cobra is an autonomous AI collections agent
for the 30M+ Latin American freelancers who earn in dollars from global clients. It chases
the invoice, settles in stablecoins, files the local tax doc — and because it learns which
clients actually pay, it can **advance you the cash today** on invoices clients haven't paid yet.

> Built for **Ethereum México 2026** (AI × Blockchain, w/ Bitso) and **Arbitrum Open House London**.

---

## Why this exists

A LATAM dev invoices a US startup for $3,000. Today they:
- lose **5–10%** to PayPal / banks / FX,
- wait **days** for the wire,
- fight **tax compliance** (MX requires monthly reporting > ~$750; 73% of businesses report
  stablecoin-tax pain),
- and — worst — *chase a client who ghosts the invoice.*

Cobra removes all four. FX is a rounding error on stablecoin rails; the AI agent does the
chasing; the tax doc generates itself; and settlement lands as pesos in a real bank via Bitso.

## The moat

Every invoice Cobra works teaches it **which global clients pay, how fast, how reliably** —
a private **client-payment-reputation graph** no competitor can buy. That graph powers the
real business: **instant invoice advances (factoring)**, priced by data nobody else has.
Own the flow → unlock credit. Compounds with every user.

## Architecture

```
App (Next.js)  ── invoice · escrow · advance · dashboard
        │
Stylus contracts (Rust→WASM, Arbitrum)        ── the deep tech
   EscrowVault     fund / conditional-release / refund-on-timeout
   AdvancePool     risk-priced factoring; pays freelancer now, collects later
   CreditVerifier  Groth16 verifier — gates every advance on a zk credit proof
        │
Reputation engine (VPS)
   receivables graph → Merkle-committed; root anchored onchain per epoch
   zk-proof: "score(client) ≥ T" — proves creditworthiness, reveals nothing
        │
AI collections agent (Bun, 24/7 on VPS)
   monitor → draft nudge → send → negotiate → escalate → settle
   Claude for language; the contract for money (clean security boundary)
        │
Rails:  USDC pay-in (Base) · MXNe swap (Etherfuse) · SPEI off-ramp (Bitso)
```

**Security boundary:** the LLM can draft and send messages freely, but it can never move
value directly — every money move passes an on-chain Stylus guardrail. Non-custodial autonomy.

## Why Stylus

The `CreditVerifier` runs Groth16 pairing math. On Stylus (Rust→WASM) this is **10–100×
cheaper** than an equivalent Solidity verifier — the exact workload Stylus exists for.
This is what lets credit decisions be *verifiable but not reverse-engineerable* — proving a
client is creditworthy without leaking the private graph that is the moat.

## Chains

| Leg | Chain |
|-----|-------|
| Pay-in (USDC, x402-native) | Base Sepolia |
| Escrow · Advance · CreditVerifier | Arbitrum Sepolia (Stylus) |
| Reputation root anchor | Ethereum (Sepolia) |

## Monorepo layout

```
contracts/   Stylus contracts (Rust)         — EscrowVault, AdvancePool, CreditVerifier
circuits/    Circom credit circuit + Groth16  — proves score(client) ≥ T
agent/       Bun AI collections agent          — autonomous receivables loop
app/         Next.js frontend                  — invoice / advance / dashboard
scripts/     deploy + demo orchestration
docs/        pitch, economics, demo script
```

## Quick start

```bash
# 1. contracts
cd contracts && cargo stylus check && cargo stylus deploy --endpoint $ARB_SEPOLIA_RPC

# 2. circuit (credit proof)
cd circuits && bash build.sh        # compiles circom, runs trusted setup, exports verifier

# 3. agent
cd agent && bun install && bun run dev

# 4. app
cd app && bun install && bun run dev
```

See `.env.example` for required keys.

## Revenue

1. **$9/mo** subscription
2. **FX spread** on USD↔MXNe
3. **Collections success fee** (% of recovered invoices)
4. **Factoring margin** on advances — the big one, fueled by the proprietary client graph

## Bounties targeted

Bitso Business · Etherfuse (MXNe) · Arbitrum (Best Agentic, Stylus) · x402.

---

*Status: hackathon build. Testnet only. Some rails run in sandbox/mock — labeled in the demo.*
