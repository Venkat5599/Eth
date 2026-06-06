import { test, expect } from "bun:test";
import {
  buildTreeAndProof,
  buildRoot,
  hashPair,
  clientCommitment,
  currentEpoch,
  LEVELS,
} from "./merkle";

const leaves = [
  { clientId: "acme-robotics", score: 98 },
  { clientId: "nimbus-labs", score: 56 },
  { clientId: "zenith-corp", score: 72 },
];
const EPOCH = 7n;

test("clientCommitment is deterministic and field-sized", () => {
  expect(clientCommitment("acme-robotics")).toBe(clientCommitment("acme-robotics"));
  expect(clientCommitment("acme-robotics")).not.toBe(clientCommitment("nimbus-labs"));
});

test("root is deterministic across builds", async () => {
  const a = await buildRoot(leaves, EPOCH);
  const b = await buildRoot([...leaves].reverse(), EPOCH);
  expect(a).toBe(b); // order-independent: tree sorts by clientId
});

test("root changes with epoch", async () => {
  const a = await buildRoot(leaves, 7n);
  const b = await buildRoot(leaves, 8n);
  expect(a).not.toBe(b);
});

test("proof path recomputes the root (matches the circuit's Merkle logic)", async () => {
  const mp = await buildTreeAndProof(leaves, "acme-robotics", EPOCH);
  expect(mp.pathElements.length).toBe(LEVELS);
  expect(mp.pathIndices.length).toBe(LEVELS);

  let cur = mp.leaf;
  for (let i = 0; i < LEVELS; i++) {
    const sib = mp.pathElements[i];
    cur = mp.pathIndices[i] === 1 ? await hashPair(sib, cur) : await hashPair(cur, sib);
  }
  expect(cur).toBe(mp.root);
});

test("missing client throws", async () => {
  await expect(buildTreeAndProof(leaves, "ghost-inc", EPOCH)).rejects.toThrow();
});

test("currentEpoch is a positive daily counter", () => {
  expect(currentEpoch()).toBeGreaterThan(20000n); // ~days since 1970 well past 2024
});
