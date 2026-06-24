import { NextResponse } from "next/server";
import { generateLiveCompetitors } from "@/lib/live-research";
import { getCachedReport, setCachedReport, CACHE_KEYS } from "@/lib/cache";
import { COMPETITOR_BRANDS } from "@/lib/competitor-arabic";

export const maxDuration = 60;

// GET — return last live-generated competitor intel + sources (cached, no tokens).
export async function GET() {
  const cached = await getCachedReport<{ competitors: unknown[]; marketGaps: string[]; sources: unknown[] }>(CACHE_KEYS.competitors);
  const allowed = new Set(COMPETITOR_BRANDS.map((b) => b.name));
  const competitors = ((cached?.data?.competitors ?? []) as any[]).filter((c) => allowed.has(c?.name));
  const evidenceSources: unknown[] = [];
  const seen = new Set<string>();
  for (const c of competitors) {
    for (const e of [...(c.arabicEvidence ?? []), ...(c.englishEvidence ?? [])]) {
      if (e?.url && !seen.has(e.url)) {
        seen.add(e.url);
        evidenceSources.push({ title: e.text, url: e.url, summary: "Classified competitor evidence for Egypt market." });
      }
    }
  }
  return NextResponse.json({
    competitors,
    marketGaps: cached?.data?.marketGaps ?? [],
    sources: evidenceSources.length ? evidenceSources : cached?.data?.sources ?? [],
    generatedAt: cached?.generatedAt ?? null,
  });
}

// POST — run live Tavily + Groq, cache, return.
export async function POST() {
  try {
    const report = await generateLiveCompetitors();
    await setCachedReport(CACHE_KEYS.competitors, report);
    return NextResponse.json({ ...report, generatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to research competitors", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
