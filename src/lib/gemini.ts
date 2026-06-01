// AI client — Groq (free tier, Llama 3.3 70B)
// OpenAI-compatible API, fast, free, good Arabic support

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  // Strip markdown code blocks if model wraps response
  return text.replace(/^```json\n?/m, "").replace(/\n?```$/m, "").trim();
}
