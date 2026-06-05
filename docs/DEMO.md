# Cobra — Demo + Deploy

## Run locally (2 terminals)

```bash
# terminal 1 — the autonomous agent + API
cd agent
bun install
bun run src/seed.ts      # seeds Acme (great payer) + Nimbus (shaky)
bun run src/index.ts     # agent live on :8787, collections loop every 20s

# terminal 2 — the app
cd app
bun install
bun run dev              # http://localhost:3000
```

Reset the demo any time with `bun run src/seed.ts` in `agent/`.

## The 90-second demo script

1. **Open the dashboard.** Point out "agent live" (top right) and the client payment graph
   (Acme score 98, Nimbus 56). The agent is already chasing both overdue invoices — show the
   "firm reminder sent" line on a card and the live console in terminal 1.
2. **The money moment.** On **Acme Robotics** ($3,000), click **Advance now**.
   Flash: *"Advanced $2,850 now. Credit proof verified (score 98 >= 65)."* The card flips to
   "advanced · pool awaits client funding." She got paid for an invoice the client has not paid.
3. **The guardrail.** On **Nimbus Labs** ($1,800), click **Advance now**.
   Flash: *"Advance declined. Credit proof rejected (score 56 < 65)."* The credit gate is real,
   not cosmetic — the agent cannot advance against a client the data says will not pay.
4. **Settlement.** Click **Simulate client pays** on Acme. The agent settles: a slice held in
   **MXNe** (Etherfuse), the rest off-ramped to a Mexican bank via **Bitso SPEI**, and a tax
   doc (`CFDI-...`) generated. Pesos landed. Score ticks up.

Punchline: *"No human approved anything. The agent chased, underwrote, advanced, settled, and
filed taxes. The credit decision was gated by a proof, not a click."*

## What is live vs simulated (be honest on stage)

| Layer | State |
|-------|-------|
| Autonomous collections loop + escalating nudges | live (Claude or template fallback) |
| Credit-score gate on advances | live |
| App + API end to end | live |
| MXNe swap + Bitso SPEI payout | simulated (sandbox keys slot in via `.env`) |
| Stylus contracts (EscrowVault / AdvancePool / CreditVerifier) | source complete; deploy on Linux |
| zk credit proof (Circom + Groth16) | circuit complete; `circuits/build.sh` runs the setup |

## Deploying the Stylus contracts (Linux / VPS)

`cargo-stylus` does not build on this Windows host (native build-script + MSVC linker).
On the Linux VPS it is clean:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
cargo install cargo-stylus
cd contracts
cargo stylus check
cargo stylus deploy --endpoint $ARB_SEPOLIA_RPC --private-key $PRIVATE_KEY
```

Then port the Groth16 verifying key from `circuits/build/verification_key.json` into the
`CreditVerifier` and wire `COBRA_CONTRACT` / `CREDIT_VERIFIER` into `agent/.env` and `app/.env.local`.

## Building the zk credit proof

```bash
cd circuits
bash build.sh            # circom compile -> powers of tau -> groth16 setup -> verifier
```

Produces the prover wasm + proving key + `verification_key.json` (ported to the Stylus
`CreditVerifier`) and a reference `Verifier.sol`.
