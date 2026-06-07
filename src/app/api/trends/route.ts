import { NextResponse } from "next/server";
import { generateLiveTrends } from "@/lib/live-research";
import { getCachedReport, setCachedReport, CACHE_KEYS } from "@/lib/cache";

export const maxDuration = 60;

// GET — return the last generated live trends + sources (cached, no tokens).
export async function GET() {
  const cached = await getCachedReport<{
    trends: unknown[]; sources: unknown[];
    demandMap?: unknown[]; rejected?: unknown[]; backlog?: unknown[];
  }>(CACHE_KEYS.trends);
  return NextResponse.json({
    trends: cached?.data?.trends ?? [],
    sources: cached?.data?.sources ?? [],
    demandMap: cached?.data?.demandMap ?? [],
    rejected: cached?.data?.rejected ?? [],
    backlog: cached?.data?.backlog ?? [],
    generatedAt: cached?.generatedAt ?? null,
  });
}

// POST — run live Tavily + Groq, cache, return (with the real sources).
export async function POST() {
  try {
    const result = await generateLiveTrends();
    await setCachedReport(CACHE_KEYS.trends, result);
    return NextResponse.json({ ...result, generatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate trends", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
