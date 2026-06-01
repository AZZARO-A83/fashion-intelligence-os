// ─── Claude (Anthropic) API — for large research tasks ───────────────
// Used for Agency Intelligence: Flash Brief, Weekly Report, Monthly Strategy
// No daily token cap — uses your Anthropic API credits

// ─── AI Router — currently using Groq (free tier) ────────────────────
// Groq free tier: 100,000 tokens/day — resets daily at midnight UTC
// Usage pattern: once every 2-3 days = well within free limits
// To switch to Claude later: update ANTHROPIC_API_KEY in Vercel

import { callGemini } from "./gemini";

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4000
): Promise<string> {
  // Using Groq (Llama 3.3 70B) — free tier, 100k tokens/day
  return callGemini(systemPrompt, userPrompt, maxTokens);
}
