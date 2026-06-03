// ─── Cached Report Reader ─────────────────────────────────────────────
// Returns the last-generated report from shared storage — no AI, no tokens.
// Every page loads this first so the whole team sees the same stored copy.

import { NextResponse } from "next/server";
import { getCachedReport, CACHE_KEYS } from "@/lib/cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as keyof typeof CACHE_KEYS | null;

  if (!type || !CACHE_KEYS[type]) {
    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  }

  const cached = await getCachedReport(CACHE_KEYS[type]);

  return NextResponse.json({
    cached: cached?.data ?? null,
    generatedAt: cached?.generatedAt ?? null,
  });
}
