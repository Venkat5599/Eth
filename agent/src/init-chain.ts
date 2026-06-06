// One-shot: initialize the deployed Cobra contract and anchor the first reputation root.
// Run after deploying both Stylus contracts (see scripts/deploy-vps.sh):
//   COBRA_CONTRACT=0x.. CREDIT_VERIFIER=0x.. USDC_TEST=0x.. PRIVATE_KEY=0x.. \
//     bun run src/init-chain.ts
//
// Idempotent-ish: if the contract is already initialized, init reverts and we continue to
// anchoring so re-runs still refresh the epoch root.

import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { store } from "./store";
import { buildRoot, currentEpoch } from "./merkle";

const RPC = process.env.ARB_SEPOLIA_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc";
const COBRA = (process.env.COBRA_CONTRACT ?? "") as `0x${string}`;
const VERIFIER = (process.env.CREDIT_VERIFIER ?? "") as `0x${string}`;
const USDC = (process.env.USDC_TEST ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
const PK = (process.env.PRIVATE_KEY ?? "") as `0x${string}`;
const ADVANCE_BPS = BigInt(process.env.ADVANCE_BPS ?? 500);
const ADVANCE_THRESHOLD = BigInt(process.env.ADVANCE_MIN_SCORE ?? 65);

if (!COBRA || !PK) {
  console.error("need COBRA_CONTRACT and PRIVATE_KEY");
  process.exit(1);
}

const ABI = [
  { type: "function", name: "init", stateMutability: "nonpayable", inputs: [{ name: "usdc", type: "address" }, { name: "credit_verifier", type: "address" }, { name: "advance_bps", type: "uint256" }, { name: "advance_threshold", type: "uint256" }], outputs: [] },
  { type: "function", name: "anchorRoot", stateMutability: "nonpayable", inputs: [{ name: "epoch", type: "uint256" }, { name: "root", type: "uint256" }], outputs: [] },
] as const;

const account = privateKeyToAccount(PK);
const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: arbitrumSepolia, transport: http(RPC) });
const url = (h: string) => `https://sepolia.arbiscan.io/tx/${h}`;

async function init() {
  try {
    const { request } = await pub.simulateContract({ address: COBRA, abi: ABI, functionName: "init", args: [USDC, VERIFIER, ADVANCE_BPS, ADVANCE_THRESHOLD], account });
    const hash = await wallet.writeContract(request);
    await pub.waitForTransactionReceipt({ hash });
    console.log(`[init] ok · ${url(hash)}`);
  } catch (e) {
    console.log(`[init] skipped (already initialized?): ${(e as Error).message.split("\n")[0]}`);
  }
}

async function anchor() {
  const reputation = store.allReputation().map((r) => ({ clientId: r.clientId, score: r.score }));
  const epoch = currentEpoch();
  const root = await buildRoot(reputation, epoch);
  const { request } = await pub.simulateContract({ address: COBRA, abi: ABI, functionName: "anchorRoot", args: [epoch, root], account });
  const hash = await wallet.writeContract(request);
  await pub.waitForTransactionReceipt({ hash });
  console.log(`[anchor] epoch ${epoch} root ${root} · ${url(hash)}`);
}

await init();
await anchor();
console.log("done.");
