//! Cobra CreditVerifier — Groth16 (BN254) verifier on Stylus, using the EVM precompiles.
//!
//! The Groth16 pairing check is performed via Arbitrum's BN254 precompiles
//! (0x06 ecAdd, 0x07 ecMul, 0x08 ecPairing) — the exact reference implementation snarkjs's
//! generated Verifier.sol targets, so a proof that snarkjs accepts verifies here byte-for-byte.
//! (An earlier in-WASM arkworks attempt could not be reconciled with snarkjs's serialization;
//! the precompile path is correct and deterministic.)
//!
//! Check:  e(-A, B) · e(alpha, beta) · e(vk_x, gamma) · e(C, delta) == 1
//!   where vk_x = IC[0] + Σ input_i · IC[i+1]
//!
//! Calldata:
//!   proof:         256 bytes = 8 BE uint256 words [a.x, a.y, b.x.c0, b.x.c1, b.y.c0, b.y.c1, c.x, c.y]
//!                  (G2 as (c0,c1); reordered to the precompile's (c1,c0) layout internally)
//!   public_inputs: [root, threshold, clientCommitment, epoch]
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use alloy_primitives::{Address, U256};
use stylus_sdk::{abi::Bytes, call::RawCall, prelude::*};

mod vk;

sol_storage! {
    #[entrypoint]
    pub struct CreditVerifier {}
}

// BN254 base field modulus (for negating G1 points).
const P: U256 = U256::from_limbs([
    0x3c208c16d87cfd47,
    0x97816a916871ca8d,
    0xb85045b68181585d,
    0x30644e72e131a029,
]);

fn precompile(addr: u8, input: &[u8]) -> Result<Vec<u8>, Vec<u8>> {
    let mut a = [0u8; 20];
    a[19] = addr;
    unsafe {
        RawCall::new_static()
            .call(Address::from(a), input)
            .map_err(|_| b"precompile call failed".to_vec())
    }
}

fn w(x: U256) -> [u8; 32] {
    x.to_be_bytes::<32>()
}

// ecMul (0x07): [x, y, scalar] -> [x', y']
fn ec_mul(px: U256, py: U256, s: U256) -> Result<(U256, U256), Vec<u8>> {
    let mut input = Vec::with_capacity(96);
    input.extend_from_slice(&w(px));
    input.extend_from_slice(&w(py));
    input.extend_from_slice(&w(s));
    let out = precompile(7, &input)?;
    if out.len() != 64 {
        return Err(b"ecMul bad output".to_vec());
    }
    Ok((
        U256::from_be_slice(&out[0..32]),
        U256::from_be_slice(&out[32..64]),
    ))
}

// ecAdd (0x06): [x1, y1, x2, y2] -> [x', y']
fn ec_add(ax: U256, ay: U256, bx: U256, by: U256) -> Result<(U256, U256), Vec<u8>> {
    let mut input = Vec::with_capacity(128);
    for v in [ax, ay, bx, by] {
        input.extend_from_slice(&w(v));
    }
    let out = precompile(6, &input)?;
    if out.len() != 64 {
        return Err(b"ecAdd bad output".to_vec());
    }
    Ok((
        U256::from_be_slice(&out[0..32]),
        U256::from_be_slice(&out[32..64]),
    ))
}

#[public]
impl CreditVerifier {
    /// Verify a Groth16 proof. Ok(true) on a valid proof, Ok(false) on invalid; Err on bad input.
    pub fn verify(&self, proof: Bytes, public_inputs: Vec<U256>) -> Result<bool, Vec<u8>> {
        let p = proof.as_slice();
        if p.len() != 256 {
            return Err(b"proof must be 256 bytes".to_vec());
        }
        let word = |i: usize| U256::from_be_slice(&p[i * 32..(i + 1) * 32]);

        let key = vk::verifying_key();
        if key.ic.len() != public_inputs.len() + 1 {
            return Err(b"public input count mismatch".to_vec());
        }

        // vk_x = IC[0] + Σ input_i · IC[i+1]
        let (mut vx, mut vy) = (key.ic[0][0], key.ic[0][1]);
        for (i, inp) in public_inputs.iter().enumerate() {
            let (mx, my) = ec_mul(key.ic[i + 1][0], key.ic[i + 1][1], *inp)?;
            let (nx, ny) = ec_add(vx, vy, mx, my)?;
            vx = nx;
            vy = ny;
        }

        // negate A: (x, p - y)
        let a_x = word(0);
        let a_y = word(1);
        let neg_a_y = if a_y.is_zero() { U256::ZERO } else { P - a_y };
        // proof B (G2) from calldata is (c0, c1); precompile wants (c1, c0)
        let b = [word(3), word(2), word(5), word(4)]; // x.c1,x.c0, y.c1,y.c0
        let c_x = word(6);
        let c_y = word(7);

        // ecPairing input: 4 pairs of (G1: 64 bytes) (G2: 128 bytes) = 768 bytes
        let mut pin: Vec<u8> = Vec::with_capacity(768);
        let mut push_g1 = |x: U256, y: U256, buf: &mut Vec<u8>| {
            buf.extend_from_slice(&w(x));
            buf.extend_from_slice(&w(y));
        };
        let mut push_g2 = |g: [U256; 4], buf: &mut Vec<u8>| {
            for v in g {
                buf.extend_from_slice(&w(v));
            }
        };
        // e(-A, B)
        push_g1(a_x, neg_a_y, &mut pin);
        push_g2(b, &mut pin);
        // e(alpha, beta)
        push_g1(key.alpha[0], key.alpha[1], &mut pin);
        push_g2(key.beta, &mut pin);
        // e(vk_x, gamma)
        push_g1(vx, vy, &mut pin);
        push_g2(key.gamma, &mut pin);
        // e(C, delta)
        push_g1(c_x, c_y, &mut pin);
        push_g2(key.delta, &mut pin);

        let out = precompile(8, &pin)?;
        // ecPairing returns 32 bytes: 1 if the pairing product is identity
        Ok(out.len() == 32 && U256::from_be_slice(&out) == U256::from(1))
    }
}
