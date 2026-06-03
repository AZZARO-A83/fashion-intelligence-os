import { NextResponse } from "next/server";
import { generateLiveTrends } from "@/lib/live-research";
import { getCachedReport, setCachedReport, CACHE_KEYS } from "@/lib/cache";

export const maxDuration = 60;

// GET — return the last generated live trends (cached, no tokens).
export async function GET() {
  const cached = await getCachedReport(CACHE_KEYS.trends);
  return NextResponse.json({
    trends: cached?.data ?? [],
    generatedAt: cached?.generatedAt ?? null,
  });
}

// POST — run live Tavily + Groq, cache, return.
export async function POST() {
  try {
    const trends = await generateLiveTrends();
    await setCachedReport(CACHE_KEYS.trends, trends);
    return NextResponse.json({ trends, generatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate trends", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
