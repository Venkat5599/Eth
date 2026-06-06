#!/usr/bin/env node
// Groth16 prover, run as a Node subprocess by the agent. snarkjs spawns web-workers that
// crash under Bun, so proving is isolated here on Node. Lives in agent/ so Node resolves
// snarkjs from agent/node_modules.
//   node agent/prove.mjs <inputJsonPath> <wasmPath> <zkeyPath>
// Prints {proof, publicSignals} as JSON on stdout.

import { readFileSync } from "node:fs";
import * as snarkjs from "snarkjs";

const [, , inputPath, wasm, zkey] = process.argv;
const input = JSON.parse(readFileSync(inputPath, "utf8"));
const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
process.stdout.write(JSON.stringify({ proof, publicSignals }));
