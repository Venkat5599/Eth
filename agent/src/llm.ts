// The language side of the agent: Claude drafts the collections nudge. The model
// only ever produces TEXT. It never moves money — that boundary is the contract's job.
// Falls back to a deterministic template when no API key is present, so the demo
// always runs.

import Anthropic from "@anthropic-ai/sdk";
import type { Invoice, Nudge } from "./types";

const key = process.env.ANTHROPIC_API_KEY;
const client = key ? new Anthropic({ apiKey: key }) : null;

function tone(nudgeCount: number): Nudge["tone"] {
  if (nudgeCount === 0) return "friendly";
  if (nudgeCount === 1) return "firm";
  return "final";
}

export async function draftNudge(inv: Invoice): Promise<Nudge> {
  const t = tone(inv.nudges.length);
  const due = new Date(inv.dueDate).toLocaleDateString("en-US");
  const fallback: Nudge = {
    at: new Date().toISOString(),
    channel: "email",
    tone: t,
    subject:
      t === "final"
        ? `Final notice: invoice ${inv.id} ($${inv.amountUsd})`
        : `Quick note on invoice ${inv.id}`,
    body:
      t === "friendly"
        ? `Hi ${inv.clientName}, a friendly reminder that invoice ${inv.id} for $${inv.amountUsd} is due ${due}. You can settle it in one click via the secure link in your original invoice. Thank you!`
        : t === "firm"
        ? `Hi ${inv.clientName}, invoice ${inv.id} for $${inv.amountUsd} (due ${due}) is now overdue. Please settle at your earliest convenience to avoid further follow-up.`
        : `Hi ${inv.clientName}, this is a final reminder for invoice ${inv.id} for $${inv.amountUsd}, now significantly overdue. Please settle within 48 hours.`,
    sent: false,
  };

  if (!client) return fallback;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system:
        "You are Cobra, an AI collections agent for a freelancer. Write a short, professional " +
        "payment-reminder email. Match the requested tone. Be warm but clear. No emojis. " +
        "Return STRICT JSON: {\"subject\": string, \"body\": string}. No money instructions, just a reminder.",
      messages: [
        {
          role: "user",
          content: `Tone: ${t}. Client: ${inv.clientName}. Invoice ${inv.id}, amount $${inv.amountUsd}, due ${due}. Prior reminders sent: ${inv.nudges.length}.`,
        },
      ],
    });
    const text = msg.content.find((b) => b.type === "text");
    if (text && "text" in text) {
      const json = JSON.parse(text.text);
      return { ...fallback, subject: json.subject, body: json.body };
    }
  } catch {
    /* fall through to template */
  }
  return fallback;
}
