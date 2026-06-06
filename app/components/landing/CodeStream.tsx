"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { useGsap } from "@/lib/gsap";

/* Aptos-style auto-scrolling code motif — streams the Grants DAO's ACTUAL Stylus contract
   logic (weighted vote + quorum-gated payout), so the device is honest.
   Rendered from a token model so no raw angle brackets confuse the JSX parser. */

type Tok = [string, string?];
const L: Tok[][] = [
  [["// module grants_dao", "cm"]],
  [["/// members propose. the crowd votes. the treasury pays.", "cm"]],
  [["/// no admin key can move the funds.", "cm"]],
  [[""]],
  [["pub fn ", "kw"], ["vote", "fn"], ["(id, support) ", "pu"], ["{", "pu"]],
  [["    let", "kw"], [" weight = self.power."], ["get", "fn"], ["(sender);", "pu"]],
  [["    if", "kw"], [" weight == "], ["0", "st"], [" { return", "kw"], [" Err("], ['"no voting power"', "st"], ["); }", "pu"]],
  [["    if", "kw"], [" now > deadline { return", "kw"], [" Err("], ['"voting closed"', "st"], ["); }", "pu"]],
  [["    if", "kw"], [" support { votes_for += weight; }", "pu"]],
  [["    else", "kw"], [" { votes_against += weight; }", "pu"]],
  [["}", "pu"]],
  [[""]],
  [["pub fn ", "kw"], ["execute", "fn"], ["(id) ", "pu"], ["{", "pu"]],
  [["    // the gate: majority + quorum, enforced on-chain", "cm"]],
  [["    if", "kw"], [" votes_for <= votes_against { return", "kw"], [" Err(..); }", "pu"]],
  [["    if", "kw"], [" votes_for < quorum { return", "kw"], [" Err("], ['"quorum"', "st"], ["); }", "pu"]],
  [["    self."], ["executed", "fn"], [".set(id, ", "pu"], ["true", "kw"], [");", "pu"]],
  [["    transfer_eth", "fn"], ["(recipient, amount)?;   "], ["// treasury pays", "cm"]],
  [["}", "pu"]],
  [[""]],
  [["// frontend — reads chain, writes via your wallet, no backend", "cm"]],
  [["const", "kw"], [" hash = "], ["await", "kw"], [" "], ["tx", "fn"], [".execute(account, id);", "pu"]],
  [["await", "kw"], [" pub."], ["waitForTransactionReceipt", "fn"], ["({ hash });", "pu"]],
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
