// Fixed-depth Poseidon Merkle tree over the client reputation leaves.
// Mirrors circuits/credit.circom exactly:
//   leaf      = Poseidon(clientCommitment, score, epoch)
//   level     = Poseidon(left, right)   with left/right ordered by the path bit
//   LEVELS    = 10  (up to 1024 clients)
//
// The root is committed publicly (and anchored on-chain per epoch). A proof shows a given
// client's leaf is in the tree without revealing the rest — the moat stays private.

// @ts-ignore - circomlibjs ships no types
import { buildPoseidon } from "circomlibjs";

export const LEVELS = 10;

// Daily epoch. The reputation root is committed per epoch (anchored on-chain), and proofs
// are bound to it — so a stale proof can't be replayed against a newer graph.
export const currentEpoch = (): bigint => BigInt(Math.floor(Date.now() / 86_400_000));

// BN254 scalar field — the field circom operates in.
const P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

type Poseidon = Awaited<ReturnType<typeof buildPoseidon>>;
let _poseidon: Poseidon | null = null;

export async function poseidon(): Promise<Poseidon> {
  if (!_poseidon) _poseidon = await buildPoseidon();
  return _poseidon;
}

// Map a client id string to a field element, deterministically.
export function clientCommitment(clientId: string): bigint {
  let acc = 0n;
  for (const ch of new TextEncoder().encode(clientId)) acc = (acc * 256n + BigInt(ch)) % P;
  return acc;
}

const h2 = (po: Poseidon, a: bigint, b: bigint): bigint =>
  BigInt(po.F.toString(po.F.e(po.F.toObject(po([a, b])))));

const h3 = (po: Poseidon, a: bigint, b: bigint, c: bigint): bigint =>
  BigInt(po.F.toString(po.F.e(po.F.toObject(po([a, b, c])))));

export interface Leaf {
  clientId: string;
  score: number;
}

export interface MerkleProof {
  root: bigint;
  leaf: bigint;
  clientCommitment: bigint;
  pathElements: bigint[]; // LEVELS siblings
  pathIndices: number[]; // LEVELS bits: 0 => node is left, 1 => node is right
}

// Build the full tree and return the root plus an inclusion proof for `targetClientId`.
export async function buildTreeAndProof(
  leaves: Leaf[],
  targetClientId: string,
  epoch: bigint,
): Promise<MerkleProof> {
  const po = await poseidon();

  // leaf layer (sorted by clientId for a deterministic tree across runs)
  const sorted = [...leaves].sort((a, b) => a.clientId.localeCompare(b.clientId));
  const commitments = sorted.map((l) => clientCommitment(l.clientId));
  let layer: bigint[] = sorted.map((l, i) => h3(po, commitments[i], BigInt(l.score), epoch));

  const targetIdx = sorted.findIndex((l) => l.clientId === targetClientId);
  if (targetIdx < 0) throw new Error(`client ${targetClientId} not in reputation set`);

  // precompute zero subtree defaults for padding
  const zeros: bigint[] = [0n];
  for (let i = 1; i <= LEVELS; i++) zeros.push(h2(po, zeros[i - 1], zeros[i - 1]));

  const leaf = layer[targetIdx];
  const targetCommitment = commitments[targetIdx];
  const pathElements: bigint[] = [];
  const pathIndices: number[] = [];

  let idx = targetIdx;
  for (let level = 0; level < LEVELS; level++) {
    const isRight = idx % 2; // 1 if current node is the right child
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    const sibling = siblingIdx < layer.length ? layer[siblingIdx] : zeros[level];
    pathElements.push(sibling);
    pathIndices.push(isRight);

    // build next layer up
    const next: bigint[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : zeros[level];
      next.push(h2(po, left, right));
    }
    layer = next.length ? next : [zeros[level + 1]];
    idx = Math.floor(idx / 2);
  }

  const root = layer[0];
  return { root, leaf, clientCommitment: targetCommitment, pathElements, pathIndices };
}
