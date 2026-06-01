import { NextResponse } from "next/server";
import { RICH_TRENDS, buildTrendsSummary } from "@/lib/trend-engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const summary = searchParams.get("summary") === "true";

  if (summary) {
    return NextResponse.json({ summary: buildTrendsSummary() });
  }

  const sorted = [...RICH_TRENDS].sort((a, b) => b.trendScore - a.trendScore);
  return NextResponse.json({ trends: sorted, count: sorted.length });
}
