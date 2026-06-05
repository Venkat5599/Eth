// The language side of the agent: an LLM drafts the collections nudge. The model
// only ever produces TEXT — it never moves money. That boundary is the contract's job.
//
// Uses any OpenAI-compatible endpoint. Default is DeepSeek (free via OpenCode Zen or
// DeepSeek direct). Set in the agent .env:
//   LLM_BASE_URL=https://api.deepseek.com/v1      # or OpenCode Zen gateway
//   LLM_MODEL=deepseek-chat
//   LLM_API_KEY=sk-...
// Falls back to a deterministic template when no key is present, so the demo always runs.

import type { Invoice, Nudge } from "./types";

const BASE_URL = process.env.LLM_BASE_URL ?? "https://api.deepseek.com/v1";
const MODEL = process.env.LLM_MODEL ?? "deepseek-chat";
const API_KEY = process.env.LLM_API_KEY ?? process.env.OPENCODE_API_KEY ?? "";

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

  if (!API_KEY) return fallback;

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are Cobra, an AI collections agent for a freelancer. Write a short, professional " +
              "payment-reminder email matching the requested tone. Warm but clear. No emojis. " +
              'Return STRICT JSON: {"subject": string, "body": string}. A reminder only, no money instructions.',
          },
          {
            role: "user",
            content: `Tone: ${t}. Client: ${inv.clientName}. Invoice ${inv.id}, amount $${inv.amountUsd}, due ${due}. Prior reminders sent: ${inv.nudges.length}.`,
          },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (text) {
      const json = JSON.parse(text);
      if (json.subject && json.body) return { ...fallback, subject: json.subject, body: json.body };
    }
  } catch {
    /* fall through to template */
  }
  return fallback;
}
