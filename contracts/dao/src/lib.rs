//! Grants DAO — on-chain treasury governance on Arbitrum Stylus (Rust -> WASM).
//!
//! Flow: the owner grants voting power to members. Members propose a grant (recipient + ETH
//! amount + description). Members vote for/against, weighted by their voting power, within the
//! voting window. After it closes, anyone can execute a proposal that passed (for > against and
//! for >= quorum) — the contract pays the grant from its treasury. Fully on-chain, no backend.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::{string::String, vec::Vec};
use alloy_primitives::{Address, U256};
use stylus_sdk::{alloy_sol_types::sol, block, call::transfer_eth, contract, evm, msg, prelude::*};

sol! {
    event ProposalCreated(uint256 indexed id, address proposer, address recipient, uint256 amount, uint256 deadline, string description);
    event Voted(uint256 indexed id, address voter, bool support, uint256 weight);
    event Executed(uint256 indexed id, address recipient, uint256 amount);
    event PowerGranted(address indexed member, uint256 amount);
}

sol_storage! {
    #[entrypoint]
    pub struct GrantsDao {
        address owner;
        uint256 voting_period;   // seconds
        uint256 quorum;          // minimum FOR votes for a proposal to pass
        uint256 total_power;     // total voting power minted
        mapping(address => uint256) power;            // member -> voting power
        uint256 count;                                // number of proposals
        mapping(uint256 => address) proposer;
        mapping(uint256 => address) recipient;
        mapping(uint256 => uint256) amount;
        mapping(uint256 => uint256) deadline;         // unix seconds
        mapping(uint256 => uint256) votes_for;
        mapping(uint256 => uint256) votes_against;
        mapping(uint256 => bool)    executed;
        mapping(uint256 => mapping(address => bool)) voted;
    }
}

#[public]
impl GrantsDao {
    /// One-time init: voting window (seconds) and quorum (in voting-power units).
    pub fn init(&mut self, voting_period: U256, quorum: U256) -> Result<(), Vec<u8>> {
        if self.owner.get() != Address::ZERO {
            return Err(b"already initialized".to_vec());
        }
        self.owner.set(msg::sender());
        self.voting_period.set(voting_period);
        self.quorum.set(quorum);
        Ok(())
    }

    /// Owner grants voting power to a member (membership + weight).
    pub fn grant_power(&mut self, member: Address, amount: U256) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(b"only owner".to_vec());
        }
        let p = self.power.getter(member).get();
        self.power.setter(member).set(p + amount);
        self.total_power.set(self.total_power.get() + amount);
        evm::log(PowerGranted { member, amount });
        Ok(())
    }

    /// Fund the treasury (any ETH sent with this call is held by the DAO).
    #[payable]
    pub fn deposit(&mut self) {}

    /// Create a grant proposal. Only members (voting power > 0) can propose.
    pub fn propose(
        &mut self,
        recipient: Address,
        amount: U256,
        description: String,
    ) -> Result<U256, Vec<u8>> {
        if self.power.getter(msg::sender()).get() == U256::ZERO {
            return Err(b"not a member".to_vec());
        }
        if amount == U256::ZERO {
            return Err(b"amount=0".to_vec());
        }
        let id = self.count.get();
        self.count.set(id + U256::from(1));
        self.proposer.setter(id).set(msg::sender());
        self.recipient.setter(id).set(recipient);
        self.amount.setter(id).set(amount);
        let deadline = U256::from(block::timestamp()) + self.voting_period.get();
        self.deadline.setter(id).set(deadline);
        evm::log(ProposalCreated {
            id,
            proposer: msg::sender(),
            recipient,
            amount,
            deadline,
            description,
        });
        Ok(id)
    }

    /// Vote on a proposal, weighted by your voting power. One vote per member.
    pub fn vote(&mut self, id: U256, support: bool) -> Result<(), Vec<u8>> {
        if id >= self.count.get() {
            return Err(b"no such proposal".to_vec());
        }
        let weight = self.power.getter(msg::sender()).get();
        if weight == U256::ZERO {
            return Err(b"no voting power".to_vec());
        }
        if U256::from(block::timestamp()) > self.deadline.getter(id).get() {
            return Err(b"voting closed".to_vec());
        }
        if self.voted.getter(id).getter(msg::sender()).get() {
            return Err(b"already voted".to_vec());
        }
        self.voted.setter(id).setter(msg::sender()).set(true);
        if support {
            self.votes_for.setter(id).set(self.votes_for.getter(id).get() + weight);
        } else {
            self.votes_against.setter(id).set(self.votes_against.getter(id).get() + weight);
        }
        evm::log(Voted { id, voter: msg::sender(), support, weight });
        Ok(())
    }

    /// Execute a passed proposal after voting closes — pays the grant from the treasury.
    pub fn execute(&mut self, id: U256) -> Result<(), Vec<u8>> {
        if id >= self.count.get() {
            return Err(b"no such proposal".to_vec());
        }
        if self.executed.getter(id).get() {
            return Err(b"already executed".to_vec());
        }
        if U256::from(block::timestamp()) <= self.deadline.getter(id).get() {
            return Err(b"voting still open".to_vec());
        }
        let f = self.votes_for.getter(id).get();
        let a = self.votes_against.getter(id).get();
        if f <= a {
            return Err(b"proposal did not pass".to_vec());
        }
        if f < self.quorum.get() {
            return Err(b"quorum not reached".to_vec());
        }
        let amt = self.amount.getter(id).get();
        if amt > contract::balance() {
            return Err(b"insufficient treasury".to_vec());
        }
        self.executed.setter(id).set(true);
        let recipient = self.recipient.getter(id).get();
        transfer_eth(recipient, amt)?;
        evm::log(Executed { id, recipient, amount: amt });
        Ok(())
    }

    // ---- views ----
    pub fn treasury(&self) -> U256 { contract::balance() }
    pub fn proposal_count(&self) -> U256 { self.count.get() }
    pub fn power_of(&self, member: Address) -> U256 { self.power.getter(member).get() }
    pub fn total_power(&self) -> U256 { self.total_power.get() }
    pub fn quorum(&self) -> U256 { self.quorum.get() }
    pub fn voting_period(&self) -> U256 { self.voting_period.get() }
    pub fn owner_addr(&self) -> Address { self.owner.get() }
    pub fn has_voted(&self, id: U256, member: Address) -> bool {
        self.voted.getter(id).getter(member).get()
    }
    /// (proposer, recipient, amount, deadline, votesFor, votesAgainst, executed)
    pub fn proposal(&self, id: U256) -> (Address, Address, U256, U256, U256, U256, bool) {
        (
            self.proposer.getter(id).get(),
            self.recipient.getter(id).get(),
            self.amount.getter(id).get(),
            self.deadline.getter(id).get(),
            self.votes_for.getter(id).get(),
            self.votes_against.getter(id).get(),
            self.executed.getter(id).get(),
        )
    }
}
