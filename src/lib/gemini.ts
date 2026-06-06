// AI client — Groq (free tier, Llama 3.3 70B)
// OpenAI-compatible API, fast, free, good Arabic support

import { recordGroqUsage, setGroqUsedToday } from "./cache";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// Groq returns x-ratelimit-used-tokens on every response (including 429s).
// This is the authoritative count — syncing it means our bar never drifts,
// even when rate-limit errors skip the normal response path.
async function syncGroqHeaders(headers: Headers): Promise<void> {
  const used = headers.get("x-ratelimit-used-tokens");
  if (used) {
    const n = parseInt(used, 10);
    if (!isNaN(n) && n > 0) await setGroqUsedToday(n);
  }
}

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4000
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: Math.min(maxTokens, 8000),
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  // Always sync Groq's authoritative used-tokens header (present even on 429).
  await syncGroqHeaders(res.headers);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  // Fallback: if Groq didn't send the header, count from response body.
  if (!res.headers.get("x-ratelimit-used-tokens")) {
    await recordGroqUsage(data.usage?.total_tokens ?? 0);
  }

  // Strip markdown code blocks if model wraps response
  return text.replace(/^```json\n?/m, "").replace(/\n?```$/m, "").trim();
}
