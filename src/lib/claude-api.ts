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
    console.error("[Claude API] Failed, trying Groq fallback:", msg);

    // Try Groq as fallback
    try {
      console.log("[Claude API] Falling back to Groq...");
      return await callGemini(systemPrompt, userPrompt, maxTokens);
    } catch (groqErr) {
      const groqMsg = groqErr instanceof Error ? groqErr.message : String(groqErr);
      throw new Error(`Both Claude and Groq failed. Claude: ${msg} | Groq: ${groqMsg}`);
    }
  }
}
