// On-chain client for the Grants DAO (Stylus, Arbitrum Sepolia). No backend — reads via a
// public RPC, writes via the browser wallet (MetaMask/injected). Stylus exports camelCase
// selectors, so the ABI names are camelCase.
"use client";

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
  formatEther,
  type Address,
} from "viem";
import { arbitrumSepolia } from "viem/chains";

export const DAO_ADDRESS = (process.env.NEXT_PUBLIC_DAO_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as Address;
const RPC = process.env.NEXT_PUBLIC_ARB_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";

export const ABI = [
  { type: "function", name: "init", stateMutability: "nonpayable", inputs: [{ name: "voting_period", type: "uint256" }, { name: "quorum", type: "uint256" }], outputs: [] },
  { type: "function", name: "grantPower", stateMutability: "nonpayable", inputs: [{ name: "member", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "join", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "propose", stateMutability: "nonpayable", inputs: [{ name: "recipient", type: "address" }, { name: "amount", type: "uint256" }, { name: "description", type: "string" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "vote", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }, { name: "support", type: "bool" }], outputs: [] },
  { type: "function", name: "execute", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "treasury", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "proposalCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "powerOf", stateMutability: "view", inputs: [{ name: "member", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalPower", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "quorum", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "ownerAddr", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "hasVoted", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }, { name: "member", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "proposal", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [
    { type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "bool" },
  ] },
] as const;

export const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });

export interface Proposal {
  id: number;
  proposer: Address;
  recipient: Address;
  amount: bigint;
  deadline: number; // unix seconds
  votesFor: bigint;
  votesAgainst: bigint;
  executed: boolean;
}

// ---- reads ----
export async function getStats() {
  const [treasury, count, totalPower, quorum, owner] = await Promise.all([
    pub.readContract({ address: DAO_ADDRESS, abi: ABI, functionName: "treasury" }),
    pub.readContract({ address: DAO_ADDRESS, abi: ABI, functionName: "proposalCount" }),
    pub.readContract({ address: DAO_ADDRESS, abi: ABI, functionName: "totalPower" }),
    pub.readContract({ address: DAO_ADDRESS, abi: ABI, functionName: "quorum" }),
    pub.readContract({ address: DAO_ADDRESS, abi: ABI, functionName: "ownerAddr" }),
  ]);
  return {
    treasury: treasury as bigint,
    count: Number(count),
    totalPower: totalPower as bigint,
    quorum: quorum as bigint,
    owner: owner as Address,
  };
}

export async function getProposals(count: number): Promise<Proposal[]> {
  const ids = Array.from({ length: count }, (_, i) => i);
  const rows = await Promise.all(
    ids.map((id) =>
      pub.readContract({ address: DAO_ADDRESS, abi: ABI, functionName: "proposal", args: [BigInt(id)] }),
    ),
  );
  return rows.map((r, id) => {
    const t = r as readonly [Address, Address, bigint, bigint, bigint, bigint, boolean];
    return {
      id,
      proposer: t[0],
      recipient: t[1],
      amount: t[2],
      deadline: Number(t[3]),
      votesFor: t[4],
      votesAgainst: t[5],
      executed: t[6],
    };
  }).reverse(); // newest first
}

export async function powerOf(addr: Address): Promise<bigint> {
  return (await pub.readContract({ address: DAO_ADDRESS, abi: ABI, functionName: "powerOf", args: [addr] })) as bigint;
}

export async function hasVoted(id: number, addr: Address): Promise<boolean> {
  return (await pub.readContract({ address: DAO_ADDRESS, abi: ABI, functionName: "hasVoted", args: [BigInt(id), addr] })) as boolean;
}

// ---- wallet ----
declare global {
  interface Window { ethereum?: any }
}

export async function connect(): Promise<Address | null> {
  if (!window.ethereum) return null;
  const [addr] = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Address[];
  // ensure Arbitrum Sepolia (0x66eee)
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x66eee" }] });
  } catch (e: any) {
    if (e?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x66eee",
          chainName: "Arbitrum Sepolia",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [RPC],
          blockExplorerUrls: ["https://sepolia.arbiscan.io"],
        }],
      });
    }
  }
  return addr ?? null;
}

function wallet(account: Address) {
  return createWalletClient({ account, chain: arbitrumSepolia, transport: custom(window.ethereum) });
}

async function send(account: Address, functionName: string, args: any[] = [], value?: bigint) {
  const { request } = await pub.simulateContract({ address: DAO_ADDRESS, abi: ABI, functionName: functionName as never, args: args as never, account, value });
  // Arbitrum Sepolia base fee can rise above the wallet's stale estimate -> "max fee per gas
  // less than block base fee". Pin generous EIP-1559 fees (0.5 gwei cap) so the tx always lands.
  const hash = await wallet(account).writeContract({
    ...request,
    maxFeePerGas: 500_000_000n,        // 0.5 gwei
    maxPriorityFeePerGas: 1_000_000n,  // 0.001 gwei
  } as never);
  await pub.waitForTransactionReceipt({ hash });
  return hash;
}

export const tx = {
  propose: (a: Address, recipient: Address, eth: string, description: string) =>
    send(a, "propose", [recipient, parseEther(eth), description]),
  vote: (a: Address, id: number, support: boolean) => send(a, "vote", [BigInt(id), support]),
  execute: (a: Address, id: number) => send(a, "execute", [BigInt(id)]),
  deposit: (a: Address, eth: string) => send(a, "deposit", [], parseEther(eth)),
  grantPower: (a: Address, member: Address, amount: string) => send(a, "grantPower", [member, BigInt(amount)]),
  join: (a: Address) => send(a, "join", []),
  transfer: (a: Address, to: Address, amount: string) => send(a, "transfer", [to, BigInt(amount)]),
};

export const fmtEth = (w: bigint) => Number(formatEther(w)).toLocaleString("en-US", { maximumFractionDigits: 4 });
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
