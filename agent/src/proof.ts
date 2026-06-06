// zk credit proof generation. Builds the witness from the reputation graph (Bun), then runs
// Groth16 in a Node subprocess (snarkjs crashes under Bun's worker polyfill), and encodes the
// proof into the 256-byte calldata the Stylus CreditVerifier expects.
//
// Artifacts come from circuits/build/ (produced by circuits/build.sh on Linux). If they are
// missing — e.g. the circuit hasn't been built yet — generateCreditProof returns null and
// the agent falls back to the off-chain score gate so the demo still runs.

import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildTreeAndProof, type Leaf } from "./merkle";

const execFileAsync = promisify(execFile);

const CIRCUITS = fileURLToPath(new URL("../../circuits/", import.meta.url));
const WASM = join(CIRCUITS, "build/credit_js/credit.wasm");
const ZKEY = join(CIRCUITS, "build/credit_final.zkey");
const PROVER = fileURLToPath(new URL("../prove.mjs", import.meta.url)); // agent/prove.mjs (Node)

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

  // Prove in a Node subprocess (Bun + snarkjs workers crash).
  const dir = mkdtempSync(join(tmpdir(), "cobra-proof-"));
  const inputPath = join(dir, "input.json");
  try {
    writeFileSync(inputPath, JSON.stringify(input));
    const { stdout } = await execFileAsync("node", [PROVER, inputPath, WASM, ZKEY], {
      maxBuffer: 16 * 1024 * 1024,
    });
    const { proof, publicSignals } = JSON.parse(stdout) as {
      proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] };
      publicSignals: string[];
    };

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
    const publicInputs = publicSignals.map((s) => BigInt(s));
    return { proofBytes, publicInputs };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
