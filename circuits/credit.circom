pragma circom 2.1.6;

// Cobra credit proof.
//
// Proves, in zero knowledge, that a client's private repayment score clears a public
// threshold AND that the client's record is committed in the public receivables-graph
// Merkle root for the current epoch — revealing neither the score nor the graph.
//
// This is what lets Cobra advance cash against an invoice: creditworthiness is provable
// to the contract, while the underlying private graph (the moat) never leaks.
//
// public  : root, threshold, clientCommitment, epoch
// private : score, pathElements[LEVELS], pathIndices[LEVELS]

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux1.circom";

// One level of a Poseidon Merkle proof.
template MerkleLevel() {
    signal input cur;
    signal input sibling;
    signal input isRight;   // 0 => cur is left, 1 => cur is right
    signal output out;

    // order the pair based on the path bit
    component leftMux  = Mux1();
    component rightMux = Mux1();
    leftMux.c[0] <== cur;     leftMux.c[1] <== sibling;  leftMux.s  <== isRight;
    rightMux.c[0] <== sibling; rightMux.c[1] <== cur;    rightMux.s <== isRight;

    component h = Poseidon(2);
    h.inputs[0] <== leftMux.out;
    h.inputs[1] <== rightMux.out;
    out <== h.out;
}

template CreditProof(LEVELS) {
    // public
    signal input root;
    signal input threshold;
    signal input clientCommitment;
    signal input epoch;

    // private
    signal input score;
    signal input pathElements[LEVELS];
    signal input pathIndices[LEVELS];

    // 1) score >= threshold  (scores are 0..100, fits well under 252 bits)
    component ge = GreaterEqThan(8);
    ge.in[0] <== score;
    ge.in[1] <== threshold;
    ge.out === 1;

    // 2) leaf = Poseidon(clientCommitment, score, epoch)
    component leaf = Poseidon(3);
    leaf.inputs[0] <== clientCommitment;
    leaf.inputs[1] <== score;
    leaf.inputs[2] <== epoch;

    // 3) recompute Merkle root from leaf + path, assert equals public root
    component levels[LEVELS];
    signal cur[LEVELS + 1];
    cur[0] <== leaf.out;
    for (var i = 0; i < LEVELS; i++) {
        levels[i] = MerkleLevel();
        levels[i].cur <== cur[i];
        levels[i].sibling <== pathElements[i];
        levels[i].isRight <== pathIndices[i];
        cur[i + 1] <== levels[i].out;
    }
    root === cur[LEVELS];
}

component main {public [root, threshold, clientCommitment, epoch]} = CreditProof(10);
