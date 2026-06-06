import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TEMP diagnostic — confirms Google Custom Search is wired right.
// Returns no secrets (only booleans + Google's own status/error text).
export async function GET() {
  const key = process.env.GOOGLE_SEARCH_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  const out: Record<string, unknown> = {
    keyPresent: !!key,
    keyLen: key ? key.length : 0,
    cxPresent: !!cx,
    cx: cx || null,
  };

  if (!key || !cx) {
    out.verdict = "Env vars missing — GOOGLE_SEARCH_KEY and/or GOOGLE_SEARCH_CX not set in this deployment.";
    return NextResponse.json(out);
  }

  // Run a few probes: simple word, with Egypt bias, without date limit.
  const probes = [
    { label: "simple", q: "linen shirt" },
    { label: "egypt-bias+date", q: "linen shirt men", extra: "&gl=eg&dateRestrict=d30" },
    { label: "fashion-trend", q: "summer 2026 colour trend" },
  ];
  const results: unknown[] = [];
  for (const p of probes) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&num=5&q=${encodeURIComponent(p.q)}${p.extra || ""}`;
      const res = await fetch(url);
      const data = await res.json();
      results.push({
        label: p.label,
        q: p.q,
        http: res.status,
        items: Array.isArray(data.items) ? data.items.length : 0,
        totalResults: data.searchInformation?.totalResults ?? null,
        error: data.error ? `${data.error.code} ${data.error.message}` : null,
        firstHost: data.items?.[0]?.displayLink || null,
      });
    } catch (e) {
      results.push({ label: p.label, error: e instanceof Error ? e.message : "fetch failed" });
    }
  }
  out.probes = results;
  return NextResponse.json(out);
}
