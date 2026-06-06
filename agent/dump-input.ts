// Build the circuit witness input for acme-robotics from the live reputation graph and write
// it to /tmp/input.json (for snarkjs CLI proving / verifier debugging).
// @ts-nocheck
import { buildTreeAndProof, currentEpoch } from "./src/merkle";
import { store } from "./src/store";
import { writeFileSync } from "node:fs";

const rep = store.allReputation().map((r) => ({ clientId: r.clientId, score: r.score }));
const mp = await buildTreeAndProof(rep, "acme-robotics", currentEpoch());
const score = rep.find((r) => r.clientId === "acme-robotics")!.score;
writeFileSync(
  "/tmp/input.json",
  JSON.stringify({
    root: mp.root.toString(),
    threshold: "65",
    clientCommitment: mp.clientCommitment.toString(),
    epoch: currentEpoch().toString(),
    score: String(score),
    pathElements: mp.pathElements.map(String),
    pathIndices: mp.pathIndices.map(String),
  }),
);
console.log("wrote /tmp/input.json (epoch", currentEpoch().toString() + ")");
