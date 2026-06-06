# Cobra — Build TODO

Tracking the path from hackathon scaffold → demo-complete + bounty-ready.
Status: 🔴 not started · 🟡 in progress · ✅ done · ⏸️ blocked (needs key/VPS)

## Critical — core claims
1. 🔴 CreditVerifier Stylus contract (Groth16 verifier, Rust→WASM)
2. 🔴 Real on-chain zk gate in agent `/advance` (proof → `request_advance`)
3. 🔴 zk proof generation (Merkle tree from reputation graph + snarkjs prove)
4. ⏸️ Deploy contracts to Arbitrum Sepolia (needs funded PRIVATE_KEY)

## Important — completeness
5. 🔴 Reputation Merkle root anchor on-chain (per epoch)
6. 🔴 USDC pay-in flow (Base, x402) + approve path
7. 🔴 Real settlement rails (Etherfuse MXNe + Bitso SPEI sandbox)
8. 🔴 Create-invoice UI in app

## Polish + safety
9. 🔴 Tests — contract + agent
10. 🔴 LP withdraw fn + pool accounting review
11. 🔴 Next.js build verify (`bun run build`)
12. 🔴 `.env.example` full key coverage

## Ops
- Commit + push each task to `Venkat5599/Eth`
- Deploy code to VPS (clone/pull, toolchain, agent service)
- Run `circuits/build.sh` on VPS (Linux) → verification_key.json
- Live chain deploy: deferred until funded deployer key
