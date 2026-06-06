// Compile snarkjs's exported Verifier.sol + a verify(bytes,uint256[]) wrapper, deploy it to
// Arbitrum Sepolia, then prove verify() returns true with a real proof. Solidity uses the EVM
// ecPairing precompile directly (the reference snarkjs targets) — guaranteed to match.
//
// Run from agent/:  bun add solc && set -a; . ./.env; set +a && bun run deploy-sol-verifier.ts
//
// @ts-nocheck
import solc from "solc";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { generateCreditProof } from "./src/proof";
import { currentEpoch } from "./src/merkle";
import { store } from "./src/store";

const RPC = process.env.ARB_SEPOLIA_RPC!;
const PK = process.env.PRIVATE_KEY as `0x${string}`;

// 1) Combine snarkjs Verifier.sol + a calldata-shaped wrapper exposing verify(bytes,uint256[]).
const verSol = readFileSync(
  fileURLToPath(new URL("../circuits/build/Verifier.sol", import.meta.url)),
  "utf8",
);
const baseName = verSol.match(/contract\s+(\w+)/)![1];
const wrapper = `
contract CreditVerifier is ${baseName} {
    // proof bytes (256): [a.x,a.y, b.x.c0,b.x.c1, b.y.c0,b.y.c1, c.x,c.y]; verifyProof wants
    // G2 as [[x.c1,x.c0],[y.c1,y.c0]] -> swap each pair.
    function verify(bytes calldata p, uint256[] calldata pub) external view returns (bool) {
        require(p.length == 256, "bad proof len");
        uint256[2] memory a = [uint256(bytes32(p[0:32])), uint256(bytes32(p[32:64]))];
        uint256[2][2] memory b = [
            [uint256(bytes32(p[96:128])), uint256(bytes32(p[64:96]))],
            [uint256(bytes32(p[160:192])), uint256(bytes32(p[128:160]))]
        ];
        uint256[2] memory c = [uint256(bytes32(p[192:224])), uint256(bytes32(p[224:256]))];
        uint256[4] memory sig = [pub[0], pub[1], pub[2], pub[3]];
        return this.verifyProof(a, b, c, sig);
    }
}
`;
const source = verSol + "\n" + wrapper;

// 2) Compile.
const input = {
  language: "Solidity",
  sources: { "V.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errs = (out.errors || []).filter((e: any) => e.severity === "error");
if (errs.length) {
  console.error(errs.map((e: any) => e.formattedMessage).join("\n"));
  process.exit(1);
}
const art = out.contracts["V.sol"]["CreditVerifier"];
const bytecode = ("0x" + art.evm.bytecode.object) as `0x${string}`;
const abi = art.abi;

// 3) Deploy.
const account = privateKeyToAccount(PK);
const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: arbitrumSepolia, transport: http(RPC) });
console.log("deploying CreditVerifier (Solidity)...");
const hash = await wallet.deployContract({ abi, bytecode, args: [] });
const rcpt = await pub.waitForTransactionReceipt({ hash });
const addr = rcpt.contractAddress!;
console.log("CreditVerifier (Solidity) at:", addr);
console.log("  https://sepolia.arbiscan.io/address/" + addr);

// 4) Prove verify() works with a real proof.
const reputation = store.allReputation().map((r) => ({ clientId: r.clientId, score: r.score }));
const proof = await generateCreditProof("acme-robotics", 65, reputation, currentEpoch());
if (!proof) {
  console.log("could not generate proof");
  process.exit(1);
}
const ok = await pub.readContract({
  address: addr,
  abi,
  functionName: "verify",
  args: [proof.proofBytes, proof.publicInputs],
});
console.log("ON-CHAIN verify() =>", ok);
console.log(ok ? "✅ zk credit gate verified on-chain" : "❌ still false — encoding adjust needed");
