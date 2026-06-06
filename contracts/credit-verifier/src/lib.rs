//! Cobra CreditVerifier — Groth16 (BN254) proof verifier as a Stylus contract.
//!
//! The Cobra contract calls `verify(proof, public_inputs)` before releasing any factoring
//! advance. A `true` result means: the freelancer holds a zk proof that the client's private
//! repayment score clears the public threshold AND that the client is committed in the public
//! receivables-graph Merkle root — without revealing the score or the graph.
//!
//! Why Stylus: a Solidity Groth16 verifier offloads the pairing to the ecPairing precompile.
//! Here the BN254 pairing runs in WASM via arkworks — the exact heavy-math workload Stylus
//! makes cheap. The verifying key is embedded (see `vk.rs`, regenerated from the circuit's
//! `verification_key.json`); proof + public inputs arrive as calldata.
//!
//! Calldata layout:
//!   proof:         256 bytes = 8 big-endian uint256 words
//!                  [ a.x, a.y,  b.x.c0, b.x.c1,  b.y.c0, b.y.c1,  c.x, c.y ]
//!                  (G2 coordinates are (c0, c1) = (real, imaginary); the off-chain prover
//!                   reorders snarkjs output to match — see agent/src/proof.ts)
//!   public_inputs: the circuit's public signals, in declaration order:
//!                  [ root, threshold, clientCommitment, epoch ]
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use alloy_primitives::U256;
use stylus_sdk::{abi::Bytes, prelude::*};

mod vk;

use ark_bn254::{Bn254, Fq, Fq2, Fr, G1Affine, G2Affine};
use ark_ff::PrimeField;
use ark_groth16::{prepare_verifying_key, Groth16, Proof};
use ark_snark::SNARK;

sol_storage! {
    #[entrypoint]
    pub struct CreditVerifier {}
}

#[inline]
fn fq(word: &[u8]) -> Fq {
    Fq::from_be_bytes_mod_order(word)
}

#[public]
impl CreditVerifier {
    /// Verify a Groth16 proof against the embedded verifying key.
    /// Returns Ok(true) on a valid proof, Ok(false) on an invalid one. Errors only on
    /// malformed calldata so the caller can distinguish "rejected" from "bad input".
    pub fn verify(&self, proof: Bytes, public_inputs: Vec<U256>) -> Result<bool, Vec<u8>> {
        let p = proof.as_slice();
        if p.len() != 256 {
            return Err(b"proof must be 256 bytes (8 words)".to_vec());
        }
        let word = |i: usize| &p[i * 32..(i + 1) * 32];

        // Use *_unchecked so a malformed point can't panic the contract; an off-curve or
        // wrong point simply makes the pairing check fail -> Ok(false).
        let a = G1Affine::new_unchecked(fq(word(0)), fq(word(1)));
        let b = G2Affine::new_unchecked(
            Fq2::new(fq(word(2)), fq(word(3))),
            Fq2::new(fq(word(4)), fq(word(5))),
        );
        let c = G1Affine::new_unchecked(fq(word(6)), fq(word(7)));
        let proof = Proof::<Bn254> { a, b, c };

        let vk = vk::verifying_key();
        // gamma_abc must have exactly public_inputs.len() + 1 points.
        if vk.gamma_abc_g1.len() != public_inputs.len() + 1 {
            return Err(b"public input count mismatch".to_vec());
        }
        let pvk = prepare_verifying_key(&vk);

        let mut inputs: Vec<Fr> = Vec::with_capacity(public_inputs.len());
        for x in public_inputs.iter() {
            inputs.push(Fr::from_be_bytes_mod_order(&x.to_be_bytes::<32>()));
        }

        match Groth16::<Bn254>::verify_with_processed_vk(&pvk, &inputs, &proof) {
            Ok(ok) => Ok(ok),
            Err(_) => Ok(false),
        }
    }
}

#[cfg(test)]
mod bridge_test {
    // Native test: reads a real snarkjs proof + vk from /tmp and tries both G2 orderings,
    // to pin down the snarkjs->arkworks coordinate convention. Run on the VPS after dumping:
    //   snarkjs groth16 fullprove /tmp/input.json .../credit.wasm .../credit_final.zkey \
    //     /tmp/proof.json /tmp/public.json
    //   cp circuits/build/verification_key.json /tmp/vk.json
    //   cargo test -p credit-verifier bridge -- --nocapture
    use ark_bn254::{Bn254, Fq, Fq2, Fr, G1Affine, G2Affine};
    use ark_groth16::{prepare_verifying_key, Groth16, Proof, VerifyingKey};
    use ark_snark::SNARK;
    use core::str::FromStr;
    use std::{fs, string::String, vec::Vec};

    fn fq(s: &str) -> Fq { Fq::from_str(s).unwrap() }
    fn fr(s: &str) -> Fr { Fr::from_str(s).unwrap() }
    fn g1(a: &serde_json::Value) -> G1Affine {
        G1Affine::new_unchecked(fq(a[0].as_str().unwrap()), fq(a[1].as_str().unwrap()))
    }
    // order=false: Fq2(c0,c1)=([0],[1]); order=true: swapped
    fn g2(a: &serde_json::Value, swap: bool) -> G2Affine {
        let (x0, x1) = (a[0][0].as_str().unwrap(), a[0][1].as_str().unwrap());
        let (y0, y1) = (a[1][0].as_str().unwrap(), a[1][1].as_str().unwrap());
        if swap {
            G2Affine::new_unchecked(Fq2::new(fq(x1), fq(x0)), Fq2::new(fq(y1), fq(y0)))
        } else {
            G2Affine::new_unchecked(Fq2::new(fq(x0), fq(x1)), Fq2::new(fq(y0), fq(y1)))
        }
    }

    fn build(swap: bool, rev_inputs: bool) -> Result<bool, alloc::string::String> {
        let pj: serde_json::Value =
            serde_json::from_str(&fs::read_to_string("/tmp/proof.json").unwrap()).unwrap();
        let vj: serde_json::Value =
            serde_json::from_str(&fs::read_to_string("/tmp/vk.json").unwrap()).unwrap();
        let pubs: Vec<String> =
            serde_json::from_str(&fs::read_to_string("/tmp/public.json").unwrap()).unwrap();

        let a0 = g1(&pj["pi_a"]);
        let c0 = g1(&pj["pi_c"]);
        let proof = Proof::<Bn254> {
            a: if rev_inputs { -a0 } else { a0 }, // reuse rev_inputs flag as "negate A"
            b: g2(&pj["pi_b"], swap),
            c: c0,
        };
        let ic: Vec<G1Affine> = vj["IC"].as_array().unwrap().iter().map(g1).collect();
        let vk = VerifyingKey::<Bn254> {
            alpha_g1: g1(&vj["vk_alpha_1"]),
            beta_g2: g2(&vj["vk_beta_2"], swap),
            gamma_g2: g2(&vj["vk_gamma_2"], swap),
            delta_g2: g2(&vj["vk_delta_2"], swap),
            gamma_abc_g1: ic,
        };
        let pvk = prepare_verifying_key(&vk);
        let inputs: Vec<Fr> = pubs.iter().map(|s| fr(s)).collect();
        Groth16::<Bn254>::verify_with_processed_vk(&pvk, &inputs, &proof)
            .map_err(|e| alloc::format!("{e:?}"))
    }

    #[test]
    fn find_g2_order() {
        use ark_ec::AffineRepr;
        // on-curve sanity of the parsed points
        let pj: serde_json::Value =
            serde_json::from_str(&fs::read_to_string("/tmp/proof.json").unwrap()).unwrap();
        let vj: serde_json::Value =
            serde_json::from_str(&fs::read_to_string("/tmp/vk.json").unwrap()).unwrap();
        let a = g1(&pj["pi_a"]);
        let c = g1(&pj["pi_c"]);
        let alpha = g1(&vj["vk_alpha_1"]);
        println!("on_curve: a={} c={} alpha={}", a.is_on_curve(), c.is_on_curve(), alpha.is_on_curve());
        println!("g2 b asis on_curve={}", g2(&pj["pi_b"], false).is_on_curve());
        println!("g2 b swap on_curve={}", g2(&pj["pi_b"], true).is_on_curve());
        // r = negate A
        for (s, r) in [(false, false), (false, true), (true, false), (true, true)] {
            match build(s, r) {
                Ok(v) => println!("swap={s} negA={r} => Ok({v})"),
                Err(e) => println!("swap={s} negA={r} => Err({e})"),
            }
        }
    }
}
