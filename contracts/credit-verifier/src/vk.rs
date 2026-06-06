//! Embedded Groth16 verifying key for the Cobra credit circuit.
//!
//! ⚠️  THIS IS A STUB. Regenerate after building the circuit:
//!        cd circuits && bash build.sh                 # -> build/verification_key.json
//!        node circuits/gen-vk.mjs > contracts/credit-verifier/src/vk.rs
//!
//! The stub returns the curve generators, so `verify` always returns Ok(false) — it never
//! falsely approves an advance. The real key (printed by gen-vk.mjs) carries the circuit's
//! actual alpha/beta/gamma/delta and the 5 IC points (4 public signals + 1).

use ark_bn254::{Fq, Fq2, G1Affine, G2Affine};
use ark_ec::AffineRepr;
use ark_ff::PrimeField;
use ark_groth16::VerifyingKey;
use ark_bn254::Bn254;
use alloc::vec::Vec;
use alloc::vec;

/// Build an Fq from a big-endian hex string (no 0x), reducing mod p.
#[allow(dead_code)]
fn fq(hex: &str) -> Fq {
    Fq::from_be_bytes_mod_order(&decode_hex(hex))
}

#[allow(dead_code)]
fn g1(x: &str, y: &str) -> G1Affine {
    G1Affine::new_unchecked(fq(x), fq(y))
}

#[allow(dead_code)]
fn g2(x0: &str, x1: &str, y0: &str, y1: &str) -> G2Affine {
    G2Affine::new_unchecked(Fq2::new(fq(x0), fq(x1)), Fq2::new(fq(y0), fq(y1)))
}

#[allow(dead_code)]
fn decode_hex(s: &str) -> Vec<u8> {
    let s = s.strip_prefix("0x").unwrap_or(s);
    let s = if s.len() % 2 == 1 {
        // pad odd-length
        let mut t = alloc::string::String::from("0");
        t.push_str(s);
        t
    } else {
        alloc::string::String::from(s)
    };
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len() / 2);
    let h = |c: u8| -> u8 {
        match c {
            b'0'..=b'9' => c - b'0',
            b'a'..=b'f' => c - b'a' + 10,
            b'A'..=b'F' => c - b'A' + 10,
            _ => 0,
        }
    };
    let mut i = 0;
    while i + 1 < bytes.len() || i + 1 == bytes.len() {
        if i + 1 >= bytes.len() {
            break;
        }
        out.push((h(bytes[i]) << 4) | h(bytes[i + 1]));
        i += 2;
    }
    out
}

/// The verifying key. STUB: generators only (verify -> false). Regenerate for real proofs.
pub fn verifying_key() -> VerifyingKey<Bn254> {
    VerifyingKey {
        alpha_g1: G1Affine::generator(),
        beta_g2: G2Affine::generator(),
        gamma_g2: G2Affine::generator(),
        delta_g2: G2Affine::generator(),
        // 4 public signals (root, threshold, clientCommitment, epoch) + 1
        gamma_abc_g1: vec![
            G1Affine::generator(),
            G1Affine::generator(),
            G1Affine::generator(),
            G1Affine::generator(),
            G1Affine::generator(),
        ],
    }
}
