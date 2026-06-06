# ◆ Grants DAO

**A fully on-chain grants treasury on Arbitrum Stylus. No backend, no admin keys on the money.**

Members propose grants, the community votes by weight, and once a proposal clears majority and
quorum, **anyone** can execute the payout — the contract sends the grant straight from the
treasury. Proposals, votes, quorum, and payouts all live on-chain and are verifiable on Arbiscan.

> Built for **Ethereum México 2026** (Arbitrum / Stylus track).

---

## Why it's different

- **Non-custodial governance** — no admin key can move the treasury. Funds leave only when a
  proposal passes the on-chain vote. The vote is the only key to the money.
- **No backend** — the frontend reads chain state from a public RPC and writes through the
  user's own wallet. There's no server to trust, rate-limit, or take down.
- **Stylus deep tech** — the entire DAO is one Rust→WASM contract on Arbitrum, not Solidity.

## How it works

| Step | What happens |
|------|--------------|
| **Propose** | A member opens a grant: recipient, ETH amount, description. On-chain instantly. |
| **Vote** | Members vote for/against, weighted by their voting power. One ballot each, inside a fixed window. |
| **Quorum** | A proposal passes only if `for > against` **and** `for ≥ quorum`. Enforced in the contract. |
| **Execute** | After voting closes, anyone triggers the payout. The treasury pays via `transfer_eth`. |

## Live

- **App:** https://app-tau-three-38.vercel.app  ·  **DAO:** `/dao`
- **Contract (Stylus, Arbitrum Sepolia):** [`0xd082835164c1f83110a7efa1097edac998988f72`](https://sepolia.arbiscan.io/address/0xd082835164c1f83110a7efa1097edac998988f72)
- **Verified end-to-end on-chain:** propose → vote → execute pays the grant from the treasury
  ([example payout tx](https://sepolia.arbiscan.io/tx/0x13d0b47c9d80a881ab37faee98127761a73aa2d92e1a4338a87be74b7cb8cfc5)).

## Try it

1. Open `/dao`, **Connect wallet** (MetaMask auto-adds Arbitrum Sepolia).
2. The owner can grant voting power to members; anyone can **deposit** ETH to the treasury.
3. A member **proposes** a grant → members **vote** → after the window, **execute** the payout.

## Repo layout

```
contracts/dao/   Stylus DAO contract (Rust→WASM) — treasury, proposals, weighted voting,
                 quorum, execution. The whole system is here.
app/             Next.js frontend — landing + /dao (wallet-connect, reads/writes on-chain).
                 lib/dao.ts is the entire on-chain client. No backend.
```

## Contract — `GrantsDao`

- `init(voting_period, quorum)` — one-time setup.
- `grant_power(member, amount)` — owner grants voting weight (membership).
- `deposit()` *(payable)* — anyone funds the treasury.
- `propose(recipient, amount, description) -> id` — members only.
- `vote(id, support)` — weighted, one vote per member, within the window.
- `execute(id)` — after the window; pays the grant if it passed quorum + majority.
- Views: `treasury`, `proposalCount`, `proposal(id)`, `powerOf`, `totalPower`, `quorum`, `hasVoted`.

Selectors are camelCase on-chain (Stylus convention) — see `app/lib/dao.ts` for the ABI.

## Build & deploy the contract

```bash
cd contracts/dao
cargo stylus check  --endpoint $ARB_SEPOLIA_RPC
cargo stylus deploy --endpoint $ARB_SEPOLIA_RPC --private-key $PRIVATE_KEY
# then init(voting_period, quorum), grant_power(...), and deposit(...) to seed it
```

## Run the frontend

```bash
cd app && bun install
# set NEXT_PUBLIC_DAO_ADDRESS + NEXT_PUBLIC_ARB_RPC (see .env.example)
bun run dev      # http://localhost:3000
```

---

*Status: hackathon build. Testnet only (Arbitrum Sepolia).*
