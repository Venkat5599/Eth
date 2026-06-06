// Definitive: take snarkjs's OWN canonical soliditycalldata and call verifyProof with it.
// MUST return true. Then diff it against raw proof.json to find the transform snarkjs applies.
// @ts-nocheck
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";

const ADDR = process.env.SOL_VERIFIER as `0x${string}`;
const RPC = process.env.ARB_SEPOLIA_RPC!;

const raw = execSync("snarkjs zkey export soliditycalldata /tmp/public.json /tmp/proof.json", {
  cwd: "/opt/cobra/circuits",
}).toString().trim();
const [a, b, c, pub] = JSON.parse("[" + raw + "]");
const big = (x: any): any => (Array.isArray(x) ? x.map(big) : BigInt(x));

const abi = [{
  type: "function", name: "verifyProof", stateMutability: "view",
  inputs: [
    { name: "a", type: "uint256[2]" },
    { name: "b", type: "uint256[2][2]" },
    { name: "c", type: "uint256[2]" },
    { name: "pub", type: "uint256[4]" },
  ],
  outputs: [{ type: "bool" }],
}] as const;

const client = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
const ok = await client.readContract({
  address: ADDR, abi, functionName: "verifyProof",
  args: [big(a), big(b), big(c), big(pub)],
});
console.log("verifyProof(canonical) =>", ok);

const pj = JSON.parse(readFileSync("/tmp/proof.json", "utf8"));
console.log("--- compare A ---");
console.log("canonical a:", a);
console.log("proof.pi_a :", pj.pi_a.slice(0, 2));
console.log("--- compare B ---");
console.log("canonical b:", JSON.stringify(b));
console.log("proof.pi_b :", JSON.stringify(pj.pi_b.slice(0, 2)));
