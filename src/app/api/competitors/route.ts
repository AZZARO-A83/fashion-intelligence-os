import { NextResponse } from "next/server";
import { generateLiveCompetitors } from "@/lib/live-research";
import { getCachedReport, setCachedReport, CACHE_KEYS } from "@/lib/cache";

export const maxDuration = 60;

// GET — return last live-generated competitor intel (cached, no tokens).
export async function GET() {
  const cached = await getCachedReport<{ competitors: unknown[]; marketGaps: string[] }>(CACHE_KEYS.competitors);
  return NextResponse.json({
    competitors: cached?.data?.competitors ?? [],
    marketGaps: cached?.data?.marketGaps ?? [],
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
