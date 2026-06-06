// Real on-chain layer (Arbitrum Sepolia). When COBRA_CONTRACT + PRIVATE_KEY are set,
// the agent's money actions become real transactions, not console logs. If unset (local
// dev), these no-op and return null so the app still runs.

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const RPC = process.env.ARB_SEPOLIA_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";
const CONTRACT = (process.env.COBRA_CONTRACT ?? "") as `0x${string}`;
const PK = (process.env.PRIVATE_KEY ?? "") as `0x${string}`;

export const chainEnabled = !!(CONTRACT && PK);

// Stylus exports Rust fn names as-is. Minimal ABI for the actions the agent drives.
const ABI = [
  { type: "function", name: "create_invoice", stateMutability: "nonpayable", inputs: [{ name: "client", type: "address" }, { name: "amount", type: "uint256" }, { name: "due_date", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "fund_escrow", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "release", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { type: "function", name: "request_advance", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }, { name: "proof", type: "bytes" }, { name: "public_inputs", type: "uint256[]" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "anchor_root", stateMutability: "nonpayable", inputs: [{ name: "epoch", type: "uint256" }, { name: "root", type: "uint256" }], outputs: [] },
  { type: "function", name: "pool", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const account = PK ? privateKeyToAccount(PK) : undefined;
const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
const wallet = account
  ? createWalletClient({ account, chain: arbitrumSepolia, transport: http(RPC) })
  : undefined;

const explorer = (h: Hash) => `https://sepolia.arbiscan.io/tx/${h}`;

async function send(fn: string, args: unknown[]): Promise<{ hash: Hash; url: string } | null> {
  if (!chainEnabled || !wallet || !account) return null;
  const { request } = await pub.simulateContract({ address: CONTRACT, abi: ABI, functionName: fn as never, args: args as never, account });
  const hash = await wallet.writeContract(request);
  await pub.waitForTransactionReceipt({ hash });
  return { hash, url: explorer(hash) };
}

export const chain = {
  // returns the on-chain invoice id (from simulate) plus the real tx
  async createInvoice(client: `0x${string}`, amountUsd: number, dueUnix: number) {
    if (!chainEnabled || !wallet || !account) return null;
    const args = [client, parseUnits(String(amountUsd), 6), BigInt(dueUnix)] as const;
    const { result, request } = await pub.simulateContract({ address: CONTRACT, abi: ABI, functionName: "create_invoice", args: args as never, account });
    const hash = await wallet.writeContract(request);
    await pub.waitForTransactionReceipt({ hash });
    return { id: result as bigint, hash, url: explorer(hash) };
  },
  release: (id: bigint) => send("release", [id]),
  requestAdvance: (id: bigint, proof: `0x${string}`, publicInputs: bigint[]) =>
    send("request_advance", [id, proof, publicInputs]),
  anchorRoot: (epoch: bigint, root: bigint) => send("anchor_root", [epoch, root]),
};
