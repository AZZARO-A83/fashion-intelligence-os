// ─── Claude (Anthropic) API — for large research tasks ───────────────
// Used for Agency Intelligence: Flash Brief, Weekly Report, Monthly Strategy
// No daily token cap — uses your Anthropic API credits
// Falls back to Groq if Anthropic key not available

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4000
): Promise<string> {
  // Try Anthropic Claude first
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = response.content[0].type === "text"
        ? response.content[0].text
        : "";

      return text.replace(/^```json\n?/m, "").replace(/\n?```$/m, "").trim();

    } catch (err) {
      console.error("[Claude API] Error, falling back to Groq:", err);
    }
  }

  // Fallback to Groq
  const { callGemini } = await import("./gemini");
  return callGemini(systemPrompt, userPrompt, maxTokens);
}
