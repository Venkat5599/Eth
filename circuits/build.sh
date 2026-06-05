#!/usr/bin/env bash
# Compile the Cobra credit circuit, run a (dev) trusted setup, export the Groth16
# verifier. Verifier is then ported to the Stylus CreditVerifier contract.
#
# Requires: circom, snarkjs (bun add -g snarkjs), and circomlib (installed below).
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p build
echo "==> installing circomlib"
[ -d node_modules/circomlib ] || bun add circomlib >/dev/null 2>&1 || npm i circomlib

echo "==> compiling circuit"
circom credit.circom --r1cs --wasm --sym -l node_modules -o build

echo "==> powers of tau (dev, bn128, 2^14)"
PTAU=build/pot14_final.ptau
if [ ! -f "$PTAU" ]; then
  snarkjs powersoftau new bn128 14 build/pot14_0.ptau -v
  snarkjs powersoftau prepare phase2 build/pot14_0.ptau "$PTAU" -v
fi

echo "==> groth16 setup"
snarkjs groth16 setup build/credit.r1cs "$PTAU" build/credit_0.zkey
echo "cobra-dev-entropy-$(date +%s)" | snarkjs zkey contribute build/credit_0.zkey build/credit_final.zkey --name="cobra dev" -v
snarkjs zkey export verificationkey build/credit_final.zkey build/verification_key.json

echo "==> exporting Solidity verifier (reference; Stylus port lives in contracts/)"
snarkjs zkey export solidityverifier build/credit_final.zkey build/Verifier.sol

echo "==> done. artifacts in circuits/build/"
echo "    - credit_js/credit.wasm   (prover witness)"
echo "    - credit_final.zkey        (proving key)"
echo "    - verification_key.json    (verifier key -> port to Stylus CreditVerifier)"
