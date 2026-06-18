import { NextResponse } from "next/server";
import { CACHE_KEYS, getCachedReport, isFresh, setCachedReport } from "@/lib/cache";
import { fetchSearchConsoleQueries, SearchConsoleResult } from "@/lib/search-console";

export const maxDuration = 60;

const TTL_SECONDS = 24 * 60 * 60;

export async function GET() {
  const cached = await getCachedReport<SearchConsoleResult>(CACHE_KEYS.searchConsole);
  return NextResponse.json({
    data: cached?.data ?? null,
    generatedAt: cached?.generatedAt ?? null,
    cached: !!cached,
    fresh: isFresh(cached?.generatedAt, TTL_SECONDS),
  });
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const cached = await getCachedReport<SearchConsoleResult>(CACHE_KEYS.searchConsole);
    if (cached && !force && isFresh(cached.generatedAt, TTL_SECONDS)) {
      return NextResponse.json({
        data: cached.data,
        generatedAt: cached.generatedAt,
        cached: true,
        refreshed: false,
      });
    }

    const data = await fetchSearchConsoleQueries();
    await setCachedReport(CACHE_KEYS.searchConsole, data, TTL_SECONDS);
    return NextResponse.json({
      data,
      generatedAt: new Date().toISOString(),
      cached: false,
      refreshed: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Search Console refresh failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
