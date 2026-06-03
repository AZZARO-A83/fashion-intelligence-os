import { NextResponse } from "next/server";
import { getCachedReport, CACHE_KEYS } from "@/lib/cache";

// GET — return the last live-generated campaigns (cached, no tokens, shared).
// No more mock campaigns: empty until someone generates.
export async function GET() {
  const cached = await getCachedReport<unknown[]>(CACHE_KEYS.campaigns);
  return NextResponse.json({
    campaigns: cached?.data ?? [],
    generatedAt: cached?.generatedAt ?? null,
  });
}
