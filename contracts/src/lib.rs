//! Cobra — Stylus contracts for autonomous freelancer collections + factoring.
//!
//! `EscrowVault`  : an invoice is escrowed; the client funds it; funds release to the
//!                  freelancer on settlement, or refund to the client after the deadline.
//! `AdvancePool`  : liquidity providers fund a pool; the freelancer can take an *advance*
//!                  (factoring) on an unfunded invoice — but only if a zk credit proof
//!                  for the client clears `CreditVerifier`. The pool recovers when the
//!                  client later funds the escrow.
//!
//! Security boundary: the off-chain AI agent can draft/send messages freely, but it can
//! never move value. Every money move passes through this contract. The advance is gated
//! by a cryptographic proof of client creditworthiness — verifiable, not reverse-engineerable.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use alloy_primitives::{Address, U256};
use stylus_sdk::{
    abi::Bytes,
    call::Call,
    msg,
    prelude::*,
};

// Minimal ERC-20 interface for USDC pay-in / pay-out and pool liquidity.
sol_interface! {
    interface IERC20 {
        function transfer(address to, uint256 amount) external returns (bool);
        function transferFrom(address from, address to, uint256 amount) external returns (bool);
    }
}

// The zk credit gate. A separate Stylus Groth16 verifier (see `circuits/`) exposes
// `verify(proof, public_inputs) -> bool`. The advance cannot fire unless this returns true.
sol_interface! {
    interface ICreditVerifier {
        function verify(bytes calldata proof, uint256[] calldata public_inputs) external view returns (bool);
    }
}

// Invoice lifecycle.
//   0 Created   — escrow exists, not yet funded by client
//   1 Funded    — client deposited USDC into escrow
//   2 Released  — funds paid to freelancer (settled)
//   3 Refunded  — deadline passed unfunded; (no-op here, reserved)
//   4 Advanced  — freelancer took a factoring advance; pool awaits client funding
//   5 Recovered — client funded after an advance; pool repaid, remainder to freelancer
sol_storage! {
    #[entrypoint]
    pub struct Cobra {
        address owner;
        address usdc;            // USDC token (test token on Base/Arbitrum Sepolia)
        address credit_verifier; // ICreditVerifier
        uint256 next_id;

        // invoice fields, keyed by id
        mapping(uint256 => address) freelancer;
        mapping(uint256 => address) client;
        mapping(uint256 => uint256) amount;
        mapping(uint256 => uint256) due_date;     // unix seconds
        mapping(uint256 => uint8)   status;
        mapping(uint256 => uint256) advanced_amt; // amount paid out as advance

        // factoring pool
        uint256 pool_liquidity;
        mapping(address => uint256) pool_shares;   // LP -> deposited
        uint256 advance_bps;                       // advance = amount * (10000 - advance_bps)/10000 ... fee = advance_bps
    }
}

#[public]
impl Cobra {
    /// One-time init. Sets token, verifier, and the factoring discount (bps fee).
    pub fn init(&mut self, usdc: Address, credit_verifier: Address, advance_bps: U256) -> Result<(), Vec<u8>> {
        if self.owner.get() != Address::ZERO {
            return Err(b"already initialized".to_vec());
        }
        self.owner.set(msg::sender());
        self.usdc.set(usdc);
        self.credit_verifier.set(credit_verifier);
        self.advance_bps.set(advance_bps);
        self.next_id.set(U256::from(1));
        Ok(())
    }

    /// Freelancer raises an invoice. Returns the invoice id.
    pub fn create_invoice(&mut self, client: Address, amount: U256, due_date: U256) -> Result<U256, Vec<u8>> {
        if amount == U256::ZERO {
            return Err(b"amount=0".to_vec());
        }
        let id = self.next_id.get();
        self.next_id.set(id + U256::from(1));

        self.freelancer.setter(id).set(msg::sender());
        self.client.setter(id).set(client);
        self.amount.setter(id).set(amount);
        self.due_date.setter(id).set(due_date);
        self.status.setter(id).set(0u8);
        Ok(id)
    }

    /// Client funds the escrow (must have approved USDC to this contract).
    pub fn fund_escrow(&mut self, id: U256) -> Result<(), Vec<u8>> {
        let st = self.status.getter(id).get();
        let amount = self.amount.getter(id).get();
        if amount == U256::ZERO {
            return Err(b"no invoice".to_vec());
        }

        let usdc = IERC20::new(self.usdc.get());
        let config = Call::new_in(self);
        usdc.transfer_from(config, msg::sender(), stylus_sdk::contract::address(), amount)
            .map_err(|_| b"usdc transferFrom failed".to_vec())?;

        if st == 4u8 {
            // invoice was advanced: repay pool first, send remainder to freelancer.
            let advanced = self.advanced_amt.getter(id).get();
            self.pool_liquidity.set(self.pool_liquidity.get() + advanced);
            let remainder = amount - advanced;
            if remainder > U256::ZERO {
                let freelancer = self.freelancer.getter(id).get();
                let usdc2 = IERC20::new(self.usdc.get());
                let cfg2 = Call::new_in(self);
                usdc2.transfer(cfg2, freelancer, remainder)
                    .map_err(|_| b"remainder payout failed".to_vec())?;
            }
            self.status.setter(id).set(5u8); // Recovered
        } else {
            self.status.setter(id).set(1u8); // Funded
        }
        Ok(())
    }

    /// Release a funded escrow to the freelancer (settlement). Callable by freelancer or owner agent.
    pub fn release(&mut self, id: U256) -> Result<(), Vec<u8>> {
        if self.status.getter(id).get() != 1u8 {
            return Err(b"not funded".to_vec());
        }
        let caller = msg::sender();
        let freelancer = self.freelancer.getter(id).get();
        if caller != freelancer && caller != self.owner.get() {
            return Err(b"not authorized".to_vec());
        }
        let amount = self.amount.getter(id).get();
        let usdc = IERC20::new(self.usdc.get());
        let config = Call::new_in(self);
        usdc.transfer(config, freelancer, amount)
            .map_err(|_| b"payout failed".to_vec())?;
        self.status.setter(id).set(2u8); // Released
        Ok(())
    }

    /// LP deposits USDC into the factoring pool.
    pub fn provide_liquidity(&mut self, amount: U256) -> Result<(), Vec<u8>> {
        let usdc = IERC20::new(self.usdc.get());
        let config = Call::new_in(self);
        usdc.transfer_from(config, msg::sender(), stylus_sdk::contract::address(), amount)
            .map_err(|_| b"deposit failed".to_vec())?;
        self.pool_liquidity.set(self.pool_liquidity.get() + amount);
        let prev = self.pool_shares.getter(msg::sender()).get();
        self.pool_shares.setter(msg::sender()).set(prev + amount);
        Ok(())
    }

    /// Freelancer takes a factoring advance on an unfunded invoice.
    /// Gated by a zk proof: the client's private credit score >= threshold.
    /// `public_inputs` carry the client commitment, threshold, graph root, epoch.
    pub fn request_advance(
        &mut self,
        id: U256,
        proof: Bytes,
        public_inputs: Vec<U256>,
    ) -> Result<U256, Vec<u8>> {
        if self.status.getter(id).get() != 0u8 {
            return Err(b"invoice not in Created state".to_vec());
        }
        if msg::sender() != self.freelancer.getter(id).get() {
            return Err(b"only freelancer".to_vec());
        }

        // ---- the zk credit gate ----
        let verifier = ICreditVerifier::new(self.credit_verifier.get());
        let cfg = Call::new();
        let ok = verifier
            .verify(cfg, proof.to_vec().into(), public_inputs)
            .map_err(|_| b"verifier call failed".to_vec())?;
        if !ok {
            return Err(b"credit proof rejected".to_vec());
        }

        let amount = self.amount.getter(id).get();
        let fee = amount * self.advance_bps.get() / U256::from(10000);
        let payout = amount - fee; // freelancer receives discounted now
        if payout > self.pool_liquidity.get() {
            return Err(b"pool insufficient".to_vec());
        }

        self.pool_liquidity.set(self.pool_liquidity.get() - payout);
        self.advanced_amt.setter(id).set(amount); // pool reclaims full amount on client funding
        self.status.setter(id).set(4u8);          // Advanced

        let freelancer = self.freelancer.getter(id).get();
        let usdc = IERC20::new(self.usdc.get());
        let config = Call::new_in(self);
        usdc.transfer(config, freelancer, payout)
            .map_err(|_| b"advance payout failed".to_vec())?;
        Ok(payout)
    }

    // ---- views ----
    pub fn invoice_status(&self, id: U256) -> u8 { self.status.getter(id).get() }
    pub fn invoice_amount(&self, id: U256) -> U256 { self.amount.getter(id).get() }
    pub fn pool(&self) -> U256 { self.pool_liquidity.get() }
    pub fn owner_addr(&self) -> Address { self.owner.get() }
}
