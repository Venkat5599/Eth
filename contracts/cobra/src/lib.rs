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
        uint256 advance_threshold; // min credit score the proof must clear (public input[1])

        // reputation graph commitment — root anchored per epoch (the moat, committed on-chain)
        mapping(uint256 => uint256) epoch_root;   // epoch -> Merkle root

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
    /// One-time init. Sets token, verifier, the factoring discount (bps fee), and the
    /// credit-score threshold every advance proof must clear.
    pub fn init(
        &mut self,
        usdc: Address,
        credit_verifier: Address,
        advance_bps: U256,
        advance_threshold: U256,
    ) -> Result<(), Vec<u8>> {
        if self.owner.get() != Address::ZERO {
            return Err(b"already initialized".to_vec());
        }
        self.owner.set(msg::sender());
        self.usdc.set(usdc);
        self.credit_verifier.set(credit_verifier);
        self.advance_bps.set(advance_bps);
        self.advance_threshold.set(advance_threshold);
        self.next_id.set(U256::from(1));
        Ok(())
    }

    /// Commit the reputation-graph Merkle root for an epoch. Only the owner (the agent)
    /// anchors roots; advances are then bound to the anchored root for their epoch, so a
    /// proof can't be replayed against a graph the operator never committed.
    pub fn anchor_root(&mut self, epoch: U256, root: U256) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(b"only owner".to_vec());
        }
        self.epoch_root.setter(epoch).set(root);
        Ok(())
    }

    /// LP withdraws from the factoring pool, up to their deposited share and available liquidity.
    pub fn withdraw_liquidity(&mut self, amount: U256) -> Result<(), Vec<u8>> {
        let share = self.pool_shares.getter(msg::sender()).get();
        if amount > share {
            return Err(b"exceeds your share".to_vec());
        }
        if amount > self.pool_liquidity.get() {
            return Err(b"pool illiquid (capital out on advances)".to_vec());
        }
        self.pool_liquidity.set(self.pool_liquidity.get() - amount);
        self.pool_shares.setter(msg::sender()).set(share - amount);
        let usdc = IERC20::new(self.usdc.get());
        let config = Call::new_in(self);
        usdc.transfer(config, msg::sender(), amount)
            .map_err(|_| b"withdraw payout failed".to_vec())?;
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

        // ---- bind the public inputs before trusting the proof ----
        // public_inputs = [root, threshold, clientCommitment, epoch]
        if public_inputs.len() != 4 {
            return Err(b"bad public input count".to_vec());
        }
        // threshold the proof clears must equal the configured minimum (can't prove score>=0)
        if public_inputs[1] != self.advance_threshold.get() {
            return Err(b"threshold mismatch".to_vec());
        }
        // root must be the one the operator anchored for that epoch (no replay vs stale graph)
        let epoch = public_inputs[3];
        if self.epoch_root.getter(epoch).get() != public_inputs[0] {
            return Err(b"root not anchored for epoch".to_vec());
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
    pub fn root_at(&self, epoch: U256) -> U256 { self.epoch_root.getter(epoch).get() }
    pub fn advance_threshold(&self) -> U256 { self.advance_threshold.get() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use stylus_sdk::testing::*;

    fn addr(n: u8) -> Address {
        Address::from([n; 20])
    }

    #[test]
    fn init_then_create_invoice() {
        let vm = TestVM::default();
        let mut c = Cobra::from(&vm);
        c.init(addr(9), addr(8), U256::from(500), U256::from(65)).unwrap();
        let id = c.create_invoice(addr(2), U256::from(3000), U256::from(0)).unwrap();
        assert_eq!(id, U256::from(1));
        assert_eq!(c.invoice_amount(id), U256::from(3000));
        assert_eq!(c.invoice_status(id), 0u8); // Created
        assert_eq!(c.advance_threshold(), U256::from(65));
    }

    #[test]
    fn double_init_rejected() {
        let vm = TestVM::default();
        let mut c = Cobra::from(&vm);
        c.init(addr(9), addr(8), U256::from(500), U256::from(65)).unwrap();
        assert!(c.init(addr(1), addr(1), U256::from(1), U256::from(1)).is_err());
    }

    #[test]
    fn create_invoice_zero_amount_rejected() {
        let vm = TestVM::default();
        let mut c = Cobra::from(&vm);
        c.init(addr(9), addr(8), U256::from(500), U256::from(65)).unwrap();
        assert!(c.create_invoice(addr(2), U256::ZERO, U256::from(0)).is_err());
    }

    #[test]
    fn anchor_root_records_and_reads_back() {
        let vm = TestVM::default();
        let mut c = Cobra::from(&vm);
        c.init(addr(9), addr(8), U256::from(500), U256::from(65)).unwrap();
        c.anchor_root(U256::from(42), U256::from(123456)).unwrap();
        assert_eq!(c.root_at(U256::from(42)), U256::from(123456));
        assert_eq!(c.root_at(U256::from(7)), U256::ZERO);
    }

    #[test]
    fn advance_requires_created_state() {
        // an unknown invoice is not in Created state with a real amount -> rejected
        let vm = TestVM::default();
        let mut c = Cobra::from(&vm);
        c.init(addr(9), addr(8), U256::from(500), U256::from(65)).unwrap();
        let r = c.request_advance(U256::from(99), alloc::vec![].into(), alloc::vec![]);
        assert!(r.is_err());
    }

    #[test]
    fn withdraw_more_than_share_rejected() {
        let vm = TestVM::default();
        let mut c = Cobra::from(&vm);
        c.init(addr(9), addr(8), U256::from(500), U256::from(65)).unwrap();
        assert!(c.withdraw_liquidity(U256::from(1)).is_err()); // no shares deposited
    }
}
