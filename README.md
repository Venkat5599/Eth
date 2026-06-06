<p align="center">
  <img src="https://img.shields.io/badge/◆-Grants_DAO-34D399?style=for-the-badge&labelColor=0a0f12" alt="Grants DAO" />
</p>

<h1 align="center">Grants DAO</h1>

<p align="center">
  <strong>A fully on-chain grants treasury on Arbitrum Stylus — no backend, no admin keys on the money.</strong>
</p>

<p align="center">
  <a href="https://sepolia.arbiscan.io/address/0x603cff6b0f7486074b4d15e1188476e30aaf4121">
    <img src="https://img.shields.io/badge/🟢_LIVE-Arbitrum_Sepolia-34D399?style=for-the-badge" alt="Live on Arbitrum Sepolia" />
  </a>
  <img src="https://img.shields.io/badge/Stylus-Rust→WASM-DEA584?style=for-the-badge&logo=rust" alt="Stylus Rust" />
  <img src="https://img.shields.io/badge/Frontend-Next.js_+_viem-000000?style=for-the-badge&logo=next.js" alt="Next.js" />
</p>

<p align="center">
  <a href="https://app-tau-three-38.vercel.app/dao"><strong>▶ Live dApp</strong></a> ·
  <a href="https://sepolia.arbiscan.io/address/0x603cff6b0f7486074b4d15e1188476e30aaf4121"><strong>Contract on Arbiscan</strong></a>
</p>

---

## 📋 Project Overview

**Grants DAO** is a community treasury that nobody controls alone. Members propose grants, the
crowd votes weighted by a transferable governance token, and once a proposal clears quorum and
majority, **anyone** can execute the payout — the contract sends the funds directly. The entire
system is **one Rust→WASM Stylus contract** on Arbitrum. There is no backend and no admin key on
the money.

### The problem

Most community treasuries run on a **multisig** — a handful of signers who can stall, collude, or
drain the funds. And most "DAOs" are really a Google form plus a Discord vote that an admin then
executes by hand. In both cases, a **trusted human** sits between the vote and the money.

### The fix

```
Multisig / admin:   Vote (off-chain)  →  Human executes  →  Treasury moves   (trust required)
Grants DAO:         Vote (on-chain)   →  Quorum check     →  Anyone executes  (trustless)
```

The vote is the only key. No signer, no admin, no server can move the treasury.

---

## 🚀 Deployment

### Live contract on Arbitrum Sepolia

| Contract | Address | Explorer |
|----------|---------|----------|
| **GrantsDao** (Stylus) | `0x603cff6b0f7486074b4d15e1188476e30aaf4121` | [View on Arbiscan](https://sepolia.arbiscan.io/address/0x603cff6b0f7486074b4d15e1188476e30aaf4121) |

Verified end-to-end on-chain: **propose → vote → execute pays the grant from the treasury.** A
seeded proposal already has **3 distinct addresses** that each joined and voted on-chain.

### Network details

```
Network:     Arbitrum Sepolia
Chain ID:    421614
RPC URL:     https://sepolia-rollup.arbitrum.io/rpc
Explorer:    https://sepolia.arbiscan.io
Currency:    ETH (testnet)
```

---

## 🔄 How it works

| Step | What happens |
|------|--------------|
| **Join** | Anyone connects a wallet and claims **3 GOV** — a transferable governance token. Your balance is your voting weight. Permissionless, no allowlist. |
| **Propose** | A member opens a grant: recipient, ETH amount, description. On-chain instantly. |
| **Vote** | Members vote for/against, weighted by GOV. One ballot each, inside a fixed window. |
| **Quorum** | Passes only if `for > against` **and** `for ≥ quorum`. Enforced in the contract. |
| **Execute** | After voting closes, **anyone** triggers the payout. The treasury pays via `transfer_eth`. No countersignature, no admin. |

---

## 🛡️ Why it's different

| | Grants DAO | Multisig / admin |
|--|------------|------------------|
| Treasury moves by | **on-chain vote only** | a few signers |
| Admin can drain funds | **no** | yes |
| Membership | **permissionless (`join`)** | hand-picked |
| Voting power | **transferable token** | fixed keys |
| Backend / server | **none** | usually required |
| Execution | **anyone, after quorum** | a signer, by hand |

- **Non-custodial governance** — no admin key can move the treasury.
- **No backend** — the frontend reads chain state from a public RPC and writes through the user's own wallet. Nothing to trust, rate-limit, or take down.
- **Transferable governance token** — voting power is a real ERC-20-style token (`join`, `transfer`, `balanceOf`, `totalSupply`).
- **Stylus deep tech** — the whole DAO is Rust compiled to WASM, the workload Arbitrum built Stylus for.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       WALLET (MetaMask)                        │
│              reads via public RPC · writes via wallet          │
└──────────────────────────────────────────────────────────────┘
                              │   (no backend)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│          GrantsDao — Stylus contract (Rust → WASM)             │
│        0x603cff6b0f7486074b4d15e1188476e30aaf4121              │
│                                                                │
│  GOV token        Proposals           Treasury                 │
│  join()           propose()           deposit()  (payable)     │
│  transfer()       vote(id, support)   execute(id) ──┐          │
│  balanceOf()      ┌──────────────┐                  │          │
│                   │  quorum gate │  for > against   │          │
│                   │  (MUST PASS) │  AND for ≥ quorum │          │
│                   └──────┬───────┘                  ▼          │
│                          └──────────────►  transfer_eth(grant) │
└──────────────────────────────────────────────────────────────┘
```

---

## 📖 Contract reference — `GrantsDao`

| Function | Description | Access |
|----------|-------------|--------|
| `init(voting_period, quorum)` | One-time setup | deployer |
| `join()` | Become a member, mint 3 GOV | anyone |
| `transfer(to, amount)` | Move GOV (voting power) | holder |
| `grant_power(member, amount)` | Owner grants extra weight | owner |
| `deposit()` *(payable)* | Fund the treasury | anyone |
| `propose(recipient, amount, description)` | Open a grant | members |
| `vote(id, support)` | Weighted vote, once per member | members |
| `execute(id)` | Pay a passed grant after the window | anyone |
| `treasury` · `proposal(id)` · `balanceOf` · `totalSupply` · `quorum` · `hasVoted` | Views | view |

> Stylus exports camelCase selectors (`grantPower`, `balanceOf`, …) — see `app/lib/dao.ts` for the ABI.

---

## 💻 How to use the contract

### TypeScript / viem (browser wallet)

```typescript
import { createPublicClient, createWalletClient, custom, http, parseEther } from "viem";
import { arbitrumSepolia } from "viem/chains";

const DAO = "0x603cff6b0f7486074b4d15e1188476e30aaf4121";
const ABI = [
  "function join()",
  "function propose(address recipient, uint256 amount, string description) returns (uint256)",
  "function vote(uint256 id, bool support)",
  "function execute(uint256 id)",
  "function proposal(uint256 id) view returns (address,address,uint256,uint256,uint256,uint256,bool)",
]; // full ABI object form in app/lib/dao.ts

const pub = createPublicClient({ chain: arbitrumSepolia, transport: http() });
const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
const wallet = createWalletClient({ account, chain: arbitrumSepolia, transport: custom(window.ethereum) });

// 1. Become a member (mints 3 GOV voting power)
await wallet.writeContract({ address: DAO, abi: ABI, functionName: "join" });

// 2. Propose a grant: 0.01 ETH to a recipient
const id = await wallet.writeContract({
  address: DAO, abi: ABI, functionName: "propose",
  args: ["0xRecipient...", parseEther("0.01"), "Fund open-source tooling"],
});

// 3. Vote FOR
await wallet.writeContract({ address: DAO, abi: ABI, functionName: "vote", args: [id, true] });

// 4. After the voting window closes, anyone executes the payout
await wallet.writeContract({ address: DAO, abi: ABI, functionName: "execute", args: [id] });
```

### Read state (no wallet needed)

```typescript
const [proposer, recipient, amount, deadline, votesFor, votesAgainst, executed] =
  await pub.readContract({ address: DAO, abi: ABI, functionName: "proposal", args: [0n] });
```

---

## 🧪 Demo flow

```
✅ join()            → member receives 3 GOV
✅ propose(...)      → grant proposal created on-chain
✅ vote(id, true)    → weighted vote recorded (one per member)
✅ execute(id)       → treasury pays the grant   (after window, if quorum + majority)
❌ execute too early → reverts ("voting still open")
❌ execute if failed → reverts ("proposal did not pass" / "quorum not reached")
```

Verified live: a seeded proposal has **3 distinct voters** (owner + 2 members who each `join()`ed),
and the propose→vote→execute payout has been confirmed on-chain.

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| **Live dApp** | https://app-tau-three-38.vercel.app/dao |
| **Contract (Arbiscan)** | https://sepolia.arbiscan.io/address/0x603cff6b0f7486074b4d15e1188476e30aaf4121 |
| **Repository** | https://github.com/Venkat5599/GrantsDAO |
| **Arbitrum Sepolia faucet** | https://www.alchemy.com/faucets/arbitrum-sepolia |

---

## 📁 Project structure

```
contracts/dao/   Stylus DAO contract (Rust → WASM) — the entire system: treasury,
                 governance token, proposals, weighted voting, quorum, execution.
app/             Next.js frontend — landing + /dao (wallet-connect dApp).
                 lib/dao.ts is the complete on-chain client. No backend.
```

---

## 🛠️ Build & deploy the contract

```bash
cd contracts/dao
cargo stylus check  --endpoint https://sepolia-rollup.arbitrum.io/rpc
cargo stylus deploy --endpoint https://sepolia-rollup.arbitrum.io/rpc --private-key $PRIVATE_KEY
# then init(voting_period, quorum); members join(); deposit() to fund the treasury
```

## 🖥️ Run the frontend

```bash
cd app && bun install
# set NEXT_PUBLIC_DAO_ADDRESS + NEXT_PUBLIC_ARB_RPC  (see .env.example)
bun run dev      # http://localhost:3000  →  /dao
```

### Try the live demo

1. Open **[/dao](https://app-tau-three-38.vercel.app/dao)** and **Connect wallet** (MetaMask auto-adds Arbitrum Sepolia).
2. **Join** to claim 3 GOV → **propose** a grant → **vote For** → after the window, **execute** the payout.
3. Watch the ETH leave the treasury on Arbiscan.

---

## 🛠️ Tech stack

- **Smart contract:** Rust → WASM on **Arbitrum Stylus**
- **Frontend:** Next.js · viem · TailwindCSS · GSAP/Motion
- **Chain:** Arbitrum Sepolia · **no backend** (reads RPC, writes via wallet)

---

## 📈 Roadmap

- [x] Stylus contract deployed & activated on Arbitrum Sepolia
- [x] Transferable GOV governance token (`join` / `transfer`)
- [x] Weighted voting + quorum + on-chain execution
- [x] Treasury deposits & automatic payouts
- [x] Wallet-connect dApp (propose / vote / execute / join / transfer)
- [x] Multi-voter activity verified on-chain
- [ ] Snapshot-based voting power (ERC20Votes) to prevent transfer-then-revote
- [ ] Time-locked execution + proposal cancellation
- [ ] Mainnet deployment + security audit

---

<div align="center">

## Built for Ethereum México 2026 — Arbitrum / Stylus track ◆

*A treasury that answers to the vote, and nothing else.*

</div>
