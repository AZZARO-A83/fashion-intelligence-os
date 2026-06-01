// ─── Step 1: Live Web Research ────────────────────────────────────────
// Runs all Tavily searches and returns structured research data
// Fast: ~10-15 seconds max
// Frontend calls this first, then passes results to the generation endpoint

import { NextResponse } from "next/server";
import {
  searchEgyptianFashionTrends,
  searchCompetitorActivity,
  searchEgyptianInfluencers,
  searchMarketIntelligence,
} from "@/lib/tavily";

export const maxDuration = 30;

export async function GET() {
  try {
    console.log("[Research] Starting live web searches...");

    // Run all searches in parallel — fastest possible
    const [trends, competitors, influencers, market] = await Promise.all([
      searchEgyptianFashionTrends(),
      searchCompetitorActivity(),
      searchEgyptianInfluencers(),
      searchMarketIntelligence(),
    ]);

    console.log("[Research] All searches complete");

    return NextResponse.json({
      trends,
      competitors,
      influencers,
      market,
      searchedAt: new Date().toISOString(),
      status: "complete",
    });

  } catch (err) {
    console.error("[Research] Search error:", err);
    return NextResponse.json(
      { error: "Search failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
