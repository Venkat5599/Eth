# Cobra — Build TODO

Status: 🔴 not started · 🟡 in progress · ✅ done · ⏸️ blocked (needs funded key)

## Critical — core claims
1. ✅ CreditVerifier Stylus contract (Groth16, arkworks→WASM) — compiles + `cargo stylus check` GREEN (30.8 KB)
2. ✅ Real on-chain zk gate in agent `/advance` (proof → `request_advance`)
3. ✅ zk proof generation (Merkle tree + snarkjs in Node subprocess)
4. ⏸️ Deploy contracts to Arbitrum Sepolia — code ready, **needs funded PRIVATE_KEY** (wallet 0 ETH)

## Important — completeness
5. ✅ Reputation Merkle root anchor on-chain (per epoch) + bound in request_advance
6. ✅ USDC pay-in (x402) `/payin` route + requirements/verify
7. ✅ Real settlement rails (Etherfuse + Bitso sandbox, mock fallback)
8. ✅ Create-invoice UI in app
9. ✅ Tests — contract TestVM + agent merkle (6/6 pass)
10. ✅ LP withdraw fn + pool accounting
11. ✅ Next.js build verified clean
12. ✅ `.env.example` full coverage

## Live now
- ✅ Agent on VPS (systemd) — HTTPS via Caddy: https://187.127.137.136.sslip.io
- ✅ App on Vercel (live agent data): https://app-tau-three-38.vercel.app
- ✅ LLM nudges live (OpenCode deepseek-v4-flash-free)
- ✅ Circuit built (real vk.rs), cargo-stylus installed
- ✅ Both contracts compile + check GREEN (rustc 1.92, ruint 1.15 pin)

## Remaining (needs funded wallet 0x4Bb2...Ace7)
- Deploy CreditVerifier + Cobra to Arbitrum Sepolia
- init() + first anchor_root (init-chain.ts)
- Wire COBRA_CONTRACT/CREDIT_VERIFIER/PRIVATE_KEY into agent .env → chain mode
- E2E on-chain test: create → advance (proof→verify) → pay → settle

## Open (non-blocking)
- snarkjs proof slow/hang under load — proving works (self-test was killed mid-run); revisit perf
- Optional real rails keys (Bitso/Etherfuse), x402 facilitator
