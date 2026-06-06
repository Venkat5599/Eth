// zk credit proof generation. Builds the witness from the reputation graph, runs Groth16
// (snarkjs) against the compiled circuit, and encodes the proof into the 256-byte calldata
// the Stylus CreditVerifier expects.
//
// Artifacts come from circuits/build/ (produced by circuits/build.sh on Linux). If they are
// missing — e.g. the circuit hasn't been built yet — generateCreditProof returns null and
// the agent falls back to the off-chain score gate so the demo still runs.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
// @ts-ignore - snarkjs ships no types
import * as snarkjs from "snarkjs";
import { buildTreeAndProof, type Leaf } from "./merkle";

const WASM = fileURLToPath(new URL("../../circuits/build/credit_js/credit.wasm", import.meta.url));
const ZKEY = fileURLToPath(new URL("../../circuits/build/credit_final.zkey", import.meta.url));

export const circuitReady = () => existsSync(WASM) && existsSync(ZKEY);

const word = (x: bigint | string) => BigInt(x).toString(16).padStart(64, "0");

export interface CreditProof {
  proofBytes: `0x${string}`; // 256 bytes: [a.x,a.y, b.x.c0,b.x.c1, b.y.c0,b.y.c1, c.x,c.y]
  publicInputs: bigint[]; // [root, threshold, clientCommitment, epoch]
}

export async function generateCreditProof(
  targetClientId: string,
  threshold: number,
  reputation: Leaf[],
  epoch: bigint,
): Promise<CreditProof | null> {
  if (!circuitReady()) return null;

  const mp = await buildTreeAndProof(reputation, targetClientId, epoch);
  const score = reputation.find((r) => r.clientId === targetClientId)?.score ?? 0;
  if (score < threshold) return null; // would not satisfy the circuit constraint

  const input = {
    root: mp.root.toString(),
    threshold: String(threshold),
    clientCommitment: mp.clientCommitment.toString(),
    epoch: epoch.toString(),
    score: String(score),
    pathElements: mp.pathElements.map(String),
    pathIndices: mp.pathIndices.map(String),
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);

  // snarkjs stores G2 as [c0, c1]; ark Fq2::new(c0, c1) — no swap. See gen-vk.mjs.
  const proofBytes =
    ("0x" +
      word(proof.pi_a[0]) +
      word(proof.pi_a[1]) +
      word(proof.pi_b[0][0]) +
      word(proof.pi_b[0][1]) +
      word(proof.pi_b[1][0]) +
      word(proof.pi_b[1][1]) +
      word(proof.pi_c[0]) +
      word(proof.pi_c[1])) as `0x${string}`;

  // publicSignals order matches the circuit's public[] declaration:
  // [root, threshold, clientCommitment, epoch]
  const publicInputs = (publicSignals as string[]).map((s) => BigInt(s));

  return { proofBytes, publicInputs };
}
