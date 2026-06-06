// Isolation: call verifyProof() on the deployed Solidity verifier with the RAW snarkjs proof
// (/tmp/proof.json + /tmp/public.json) — the exact data snarkjs CLI verified. Tries the
// snarkjs G2 swap and no-swap to pin the convention.
// @ts-nocheck
import { readFileSync } from "node:fs";
import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";

const ADDR = (process.env.SOL_VERIFIER || "0xe8b91defe13bd2da5ba1bcd88f7bc6fd984e1297") as `0x${string}`;
const RPC = process.env.ARB_SEPOLIA_RPC!;
const proof = JSON.parse(readFileSync("/tmp/proof.json", "utf8"));
const pub = JSON.parse(readFileSync("/tmp/public.json", "utf8")).map((s: string) => BigInt(s));

const abi = [{
  type: "function", name: "verifyProof", stateMutability: "view",
  inputs: [
    { name: "_pA", type: "uint256[2]" },
    { name: "_pB", type: "uint256[2][2]" },
    { name: "_pC", type: "uint256[2]" },
    { name: "_pubSignals", type: "uint256[4]" },
  ],
  outputs: [{ type: "bool" }],
}] as const;

const client = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];

async function call(b: bigint[][], label: string) {
  try {
    const ok = await client.readContract({ address: ADDR, abi, functionName: "verifyProof", args: [a, b, c, pub] });
    console.log(`${label} => ${ok}`);
  } catch (e: any) {
    console.log(`${label} => ERROR ${String(e.shortMessage || e).slice(0, 80)}`);
  }
}

// swapped (snarkjs Solidity convention): [[x.c1,x.c0],[y.c1,y.c0]]
await call(
  [[BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])], [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]],
  "B swapped (c1,c0)",
);
// no swap: [[x.c0,x.c1],[y.c0,y.c1]]
await call(
  [[BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])], [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])]],
  "B no-swap (c0,c1)",
);
console.log("public:", pub.map(String).join(", "));
