"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useGsap } from "@/lib/gsap";

/* Aptos-style auto-scrolling code motif — but it streams Cobra's ACTUAL contract
   logic (Stylus advance gate + Circom credit constraint), so the device is honest.
   Rendered from a token model so no raw angle brackets confuse the JSX parser. */

type Tok = [string, ("cm" | "kw" | "fn" | "st" | "pu")?];
const L: Tok[][] = [
  [["// module cobra::collections", "cm"]],
  [["/// the agent chases. the contract holds the money.", "cm"]],
  [["/// an LLM can draft a nudge. it can never move value.", "cm"]],
  [[""]],
  [["pub fn ", "kw"], ["request_advance", "fn"], ["(id, proof, public_inputs) ", "pu"], ["{", "pu"]],
  [["    // the zk credit gate, provable, not reverse-engineerable", "cm"]],
  [["    let", "kw"], [" ok = verifier."], ["verify", "fn"], ["(cfg, proof, inputs)?;", "pu"]],
  [["    if", "kw"], [" !ok "], ["{", "pu"], [" return", "kw"], [" Err("], ['"credit proof rejected"', "st"], ["); }", "pu"]],
  [["    let", "kw"], [" fee = amount * advance_bps / "], ["10000", "st"], [";", "pu"]],
  [["    let", "kw"], [" payout = amount - fee;   "], ["// freelancer paid now", "cm"]],
  [["    self."], ["transfer", "fn"], ["(freelancer, payout)?;", "pu"]],
  [["}", "pu"]],
  [[""]],
  [["// circuit credit.circom, prove score >= T, reveal nothing", "cm"]],
  [["template ", "kw"], ["CreditProof", "fn"], ["(LEVELS) ", "pu"], ["{", "pu"]],
  [["    component", "kw"], [" ge = "], ["GreaterEqThan", "fn"], ["(8);", "pu"]],
  [["    ge.in[0] <== score;", "pu"]],
  [["    ge.in[1] <== threshold;", "pu"]],
  [["    ge.out === ", "pu"], ["1", "st"], [";   "], ["// the gate", "cm"]],
  [["    root === computed;   ", "pu"], ["// client is in the graph", "cm"]],
  [["}", "pu"]],
  [[""]],
  [["// agent loop, runs 24/7 on the VPS", "cm"]],
  [["while", "kw"], [" ("], ["overdue", "fn"], ["(invoice)) ", "pu"], ["{", "pu"]],
  [["    const", "kw"], [" nudge = "], ["await", "kw"], [" "], ["draftNudge", "fn"], ["(invoice);", "pu"]],
  [["    await", "kw"], [" "], ["send", "fn"], ["(nudge);   "], ["// escalates over time", "cm"]],
  [["}", "pu"]],
];

function Block() {
  return (
    <div className="code-stream px-7 py-5 text-text-dim">
      {L.map((line, i) => (
        <div key={i} className="whitespace-pre">
          {line.length === 1 && line[0][0] === "" ? (
            <br />
          ) : (
            line.map((tok, j) => (
              <span key={j} className={tok[1] ?? undefined}>
                {tok[0]}
              </span>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

export function CodeStream() {
  const wrap = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { gsap } = useGsap();

  useEffect(() => {
    if (reduce || !wrap.current) return;
    const inner = wrap.current.querySelector(".stream-inner") as HTMLElement;
    const ctx = gsap.context(() => {
      const h = inner.scrollHeight / 2;
      gsap.to(inner, { y: -h, duration: 26, ease: "none", repeat: -1 });
    }, wrap);
    return () => ctx.revert();
  }, [reduce, gsap]);

  return (
    <div ref={wrap} className="fade-y relative h-full overflow-hidden">
      <div className="stream-inner will-change-transform">
        <Block />
        <Block />
      </div>
    </div>
  );
}
