import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TEMP diagnostic — pinpoints why Google Custom Search returns 0 sources.
// Exposes NO secrets (booleans + Google's own status text only).
export async function GET() {
  const key = process.env.GOOGLE_SEARCH_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  const out: Record<string, unknown> = {
    keyPresent: !!key,
    keyLen: key ? key.length : 0,
    cxPresent: !!cx,
    cxValue: cx || null,
  };

  if (!key || !cx) {
    out.verdict = "ENV MISSING — GOOGLE_SEARCH_KEY / GOOGLE_SEARCH_CX not in this deployment.";
    return NextResponse.json(out);
  }

  // Probes isolate each suspect: date filter, query width, Egypt bias, Arabic.
  const probes: { label: string; params: Record<string, string> }[] = [
    { label: "plain (no date)", params: { q: "linen shirt" } },
    { label: "date d30", params: { q: "linen shirt", dateRestrict: "d30" } },
    { label: "egypt bias", params: { q: "linen shirt men", gl: "eg" } },
    { label: "real trend query", params: { q: "new fashion colours fabrics 2026", dateRestrict: "d30", gl: "eg" } },
    { label: "arabic", params: { q: "موضة صيف" } },
  ];

  const results: unknown[] = [];
  for (const p of probes) {
    try {
      const sp = new URLSearchParams({ key, cx, num: "5", ...p.params });
      const res = await fetch(`https://www.googleapis.com/customsearch/v1?${sp}`);
      const data = await res.json();
      results.push({
        label: p.label,
        http: res.status,
        items: Array.isArray(data.items) ? data.items.length : 0,
        totalResults: data.searchInformation?.totalResults ?? null,
        googleError: data.error ? `${data.error.code}: ${data.error.message}` : null,
        firstHost: data.items?.[0]?.displayLink || null,
      });
    } catch (e) {
      results.push({ label: p.label, fetchError: e instanceof Error ? e.message : "failed" });
    }
  }
  out.probes = results;
  return NextResponse.json(out);
}
