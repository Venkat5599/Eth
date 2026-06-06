# ◆ Grants DAO

**A fully on-chain grants treasury on Arbitrum Stylus. No backend, no admin keys on the money.**

Community treasuries run on trust — a multisig where any signer can stall, collude, or drain the funds. Most "DAOs" are a Google form and a Discord vote that an admin executes by hand. **Grants DAO removes the trusted human entirely:** the vote is the only key to the money.

## How it works

| Step | What happens |
|------|--------------|
| **Join** | Anyone connects a wallet and claims **3 GOV** — a transferable governance token. Your balance is your voting weight. Permissionless, no allowlist. |
| **Propose** | A member opens a grant: recipient, ETH amount, description. On-chain instantly. |
| **Vote** | Members vote for/against, weighted by GOV. One ballot each, inside a fixed window. |
| **Quorum** | Passes only if `for > against` **and** `for ≥ quorum`. Enforced in the contract. |
| **Execute** | After voting closes, **anyone** triggers the payout. The treasury pays via `transfer_eth`. No countersignature, no admin. |

## Why it's different

- **Non-custodial governance** — no admin key can move the treasury. Funds leave only when a proposal passes the on-chain vote.
- **No backend** — the frontend reads chain state from a public RPC and writes through the user's own wallet. There is no server to trust, rate-limit, or take down.
- **Transferable governance token** — voting power is a real ERC-20-style token (`join`, `transfer`, `balanceOf`, `totalSupply`).
- **Stylus deep tech** — the entire DAO is one Rust→WASM contract on Arbitrum, not Solidity.

## Built & verified

- **Contract (Stylus, Arbitrum Sepolia):** `0x603cff6b0f7486074b4d15e1188476e30aaf4121`
- **Verified end-to-end on-chain:** propose → vote → execute pays the grant from the treasury.
- **Live multi-voter activity:** a seeded proposal already has 3 distinct addresses that joined and voted on-chain.

## Tech stack

Rust → WASM Stylus contract · Next.js + viem wallet-connect frontend · Arbitrum Sepolia · zero backend.

## Links

- **Live app:** https://app-tau-three-38.vercel.app  ·  **DAO:** `/dao`
- **Contract on Arbiscan:** https://sepolia.arbiscan.io/address/0x603cff6b0f7486074b4d15e1188476e30aaf4121
- **Repo:** https://github.com/Venkat5599/Eth
