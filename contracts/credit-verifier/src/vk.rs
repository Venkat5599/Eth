//! Embedded Groth16 verifying key (precompile layout: G2 as [x.c1, x.c0, y.c1, y.c0]).
//!
//! ⚠️ STUB — regenerate from the circuit:
//!     cd circuits && bash build.sh        # runs gen-vk.mjs -> this file
//! The stub uses the curve generators, so the pairing never satisfies the Groth16 equation
//! and `verify` returns false — it can never falsely approve an advance.

use alloy_primitives::U256;
use alloc::vec::Vec;

pub struct Vk {
    pub alpha: [U256; 2],  // G1
    pub beta: [U256; 4],   // G2 (c1,c0 order)
    pub gamma: [U256; 4],
    pub delta: [U256; 4],
    pub ic: Vec<[U256; 2]>, // G1[]
}

#[inline]
fn u(s: &str) -> U256 {
    U256::from_str_radix(s, 10).unwrap()
}

pub fn verifying_key() -> Vk {
    // BN254 G2 generator in precompile (c1, c0) order.
    let g2 = [
        u("11559732032986387107991004021392285783925812861821192530917403151452391805634"),
        u("10857046999023057135944570762232829481370756359578518086990519993285655852781"),
        u("4082367875863433681332203403145435568316851327593401208105741076214120093531"),
        u("8495653923123431417604973247489272438418190587263600148770280649306958101930"),
    ];
    Vk {
        alpha: [u("1"), u("2")], // G1 generator
        beta: g2,
        gamma: g2,
        delta: g2,
        // 4 public signals + 1
        ic: alloc::vec![
            [u("1"), u("2")],
            [u("1"), u("2")],
            [u("1"), u("2")],
            [u("1"), u("2")],
            [u("1"), u("2")],
        ],
    }
}
