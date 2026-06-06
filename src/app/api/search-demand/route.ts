import { NextResponse } from "next/server";
import { generateSearchDemand } from "@/lib/search-demand-engine";
import { getCachedReport, setCachedReport, CACHE_KEYS } from "@/lib/cache";
import { SearchDemandResult } from "@/lib/search-demand-engine";

export const maxDuration = 60;

const TTL = 12 * 60 * 60; // 12-hour cache — no AI tokens, just Serper

export async function GET() {
  const cached = await getCachedReport<SearchDemandResult>(CACHE_KEYS.searchDemand);
  if (cached?.data) return NextResponse.json(cached.data);
  return NextResponse.json({ men: [], women: [], fabrics: [], generatedAt: null });
}

export async function POST() {
  try {
    const result = await generateSearchDemand();
    await setCachedReport(CACHE_KEYS.searchDemand, result, TTL);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate search demand", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
