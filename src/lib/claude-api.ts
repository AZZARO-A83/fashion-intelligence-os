// ─── Claude (Anthropic) API — for large research tasks ───────────────
// Used for Agency Intelligence: Flash Brief, Weekly Report, Monthly Strategy
// No daily token cap — uses your Anthropic API credits

import Anthropic from "@anthropic-ai/sdk";
import { callGemini } from "./gemini";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4000
): Promise<string> {

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[Claude API] No Anthropic key — using Groq");
    return callGemini(systemPrompt, userPrompt, maxTokens);
  }

  try {
    console.log("[Claude API] Calling Claude claude-3-5-sonnet-20241022...");
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    console.log("[Claude API] Success — used", response.usage.output_tokens, "output tokens");
    return text.replace(/^```json\n?/m, "").replace(/\n?```$/m, "").trim();

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Claude API] Failed:", msg);
    // Do NOT fall back to Groq — throw so the user sees the real error
    throw new Error(`Claude API error: ${msg}`);
  }
}
