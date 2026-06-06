// Compile + deploy the Solidity verifier under NODE (Bun can mis-compile solc's emscripten
// blob). Deploys CreditVerifier (snarkjs Groth16Verifier + verify(bytes,uint256[]) wrapper),
// then tests verifyProof with snarkjs's canonical calldata. Run: node deploy-standalone.mjs
import solc from "solc";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const RPC = process.env.ARB_SEPOLIA_RPC;
const PK = process.env.PRIVATE_KEY;
const ver = readFileSync(fileURLToPath(new URL("../circuits/build/Verifier.sol", import.meta.url)), "utf8");
const base = ver.match(/contract\s+(\w+)/)[1];
const wrapper = `
contract CreditVerifier is ${base} {
  function verify(bytes calldata p, uint256[] calldata pub) external view returns (bool) {
    require(p.length == 256, "len");
    uint256[2] memory a = [uint256(bytes32(p[0:32])), uint256(bytes32(p[32:64]))];
    uint256[2][2] memory b = [[uint256(bytes32(p[96:128])), uint256(bytes32(p[64:96]))],[uint256(bytes32(p[160:192])), uint256(bytes32(p[128:160]))]];
    uint256[2] memory c = [uint256(bytes32(p[192:224])), uint256(bytes32(p[224:256]))];
    uint256[4] memory sig = [pub[0], pub[1], pub[2], pub[3]];
    return this.verifyProof(a, b, c, sig);
  }
}`;
const input = { language: "Solidity", sources: { "V.sol": { content: ver + wrapper } },
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } };
const o = JSON.parse(solc.compile(JSON.stringify(input)));
const errs = (o.errors || []).filter((e) => e.severity === "error");
if (errs.length) { console.error(errs.map((e) => e.formattedMessage).join("\n")); process.exit(1); }
const art = o.contracts["V.sol"]["CreditVerifier"];
console.log("solc:", solc.version());

const acc = privateKeyToAccount(PK);
const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
const w = createWalletClient({ account: acc, chain: arbitrumSepolia, transport: http(RPC) });
const hash = await w.deployContract({ abi: art.abi, bytecode: "0x" + art.evm.bytecode.object, args: [] });
const r = await pub.waitForTransactionReceipt({ hash });
console.log("deployed CreditVerifier at:", r.contractAddress);

const raw = execSync("snarkjs zkey export soliditycalldata /tmp/public.json /tmp/proof.json", { cwd: "/opt/cobra/circuits" }).toString().trim();
const [a, b, c, sig] = JSON.parse("[" + raw + "]");
const big = (x) => (Array.isArray(x) ? x.map(big) : BigInt(x));
const vp = [{ type: "function", name: "verifyProof", stateMutability: "view", inputs: [{ type: "uint256[2]" }, { type: "uint256[2][2]" }, { type: "uint256[2]" }, { type: "uint256[4]" }], outputs: [{ type: "bool" }] }];
const ok = await pub.readContract({ address: r.contractAddress, abi: vp, functionName: "verifyProof", args: [big(a), big(b), big(c), big(sig)] });
console.log("verifyProof(canonical) =>", ok);
console.log(ok ? `✅ WORKS. CreditVerifier=${r.contractAddress}` : "❌ still false");
