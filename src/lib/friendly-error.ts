// ─── Friendly Error Translator ────────────────────────────────────────
// Turns scary raw API errors into plain-English messages the whole team
// understands. Detects the common Groq free-tier limits and explains them
// calmly instead of dumping red JSON.

export interface FriendlyError {
  title: string;
  message: string;
  hint?: string;
  kind: "daily-limit" | "minute-limit" | "no-key" | "search" | "generic";
}

// Pull "try again in 2h5m58s" out of a Groq error and tidy it to "2h 6m".
function extractRetry(text: string): string | null {
  const m = text.match(/try again in\s+([0-9hms.\s]+)/i);
  if (!m) return null;
  const h = m[1].match(/(\d+)\s*h/);
  const mins = m[1].match(/(\d+)\s*m/);
  const secs = m[1].match(/(\d+(?:\.\d+)?)\s*s/);
  const parts: string[] = [];
  if (h) parts.push(`${h[1]}h`);
  if (mins) parts.push(`${mins[1]}m`);
  if (!h && !mins && secs) parts.push(`${Math.ceil(parseFloat(secs[1]))}s`);
  return parts.length ? parts.join(" ") : null;
}

export function friendlyError(raw: string | null | undefined): FriendlyError {
  const text = (raw || "").toLowerCase();
  const retry = extractRetry(raw || "");
  const retryLine = retry ? ` Try again in about ${retry}.` : "";

  // Daily token cap (TPD) — the free budget for the day is used up
  if (text.includes("per day") || text.includes("tpd")) {
    return {
      kind: "daily-limit",
      title: "Daily AI limit reached",
      message:
        "The free research budget for today is used up. It refills automatically." + retryLine,
      hint: retry ? `Resets fully at midnight UTC. In normal use you won't hit this.` : "Come back in a couple of hours. In normal use you won't hit this.",
    };
  }

  // Per-minute cap (TPM) — too much sent in one minute
  if (text.includes("per minute") || text.includes("tpm") || text.includes("request too large")) {
    return {
      kind: "minute-limit",
      title: "Too much at once",
      message:
        "This request was a little too large for the per-minute limit." + (retry ? ` Try again in about ${retry}.` : " Wait about a minute, then press generate again."),
      hint: "If this keeps happening, tell the developer — the request may need trimming.",
    };
  }

  // Web search step failed
  if (text.includes("web search failed") || text.includes("search failed")) {
    return {
      kind: "search",
      title: "Live web search didn't respond",
      message:
        "The market search step couldn't fetch results just now. This is usually temporary.",
      hint: "Wait a moment and try again.",
    };
  }

  // Missing API key
  if (text.includes("api_key") || text.includes("not set") || text.includes("api key")) {
    return {
      kind: "no-key",
      title: "AI not connected",
      message: "The AI service key isn't set up for this environment.",
      hint: "Ask the developer to check the API key configuration.",
    };
  }

  // Anything else — show the raw detail so the developer can read it
  return {
    kind: "generic",
    title: "Something went wrong",
    message: raw || "Unknown error. Please try again.",
  };
}
