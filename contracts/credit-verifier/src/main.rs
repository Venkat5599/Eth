// Bin target required by cargo-stylus (deploy/export-abi). The contract logic lives in lib.rs.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

#[cfg(not(any(test, feature = "export-abi")))]
#[no_mangle]
pub extern "C" fn main() {}

#[cfg(feature = "export-abi")]
fn main() {
    credit_verifier::print_from_args();
}
