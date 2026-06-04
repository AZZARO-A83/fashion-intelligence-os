import { NextResponse } from "next/server";
import { generateLiveInspiration } from "@/lib/live-research";
import { getShopifyProductImages } from "@/lib/shopify";
import { getCachedReport, setCachedReport, CACHE_KEYS } from "@/lib/cache";

export const maxDuration = 60;

// GET — last mood boards + sources (cached) + LIVE real Shopify product images.
export async function GET() {
  const [cached, products] = await Promise.all([
    getCachedReport<{ boards: unknown[]; sources: unknown[] }>(CACHE_KEYS.inspiration),
    getShopifyProductImages(16),
  ]);
  return NextResponse.json({
    boards: cached?.data?.boards ?? [],
    sources: cached?.data?.sources ?? [],
    products, // 🟢 real Debackers product photos, live from Shopify
    generatedAt: cached?.generatedAt ?? null,
  });
}

// POST — generate live mood boards from current trends, cache, return.
export async function POST() {
  try {
    const result = await generateLiveInspiration();
    await setCachedReport(CACHE_KEYS.inspiration, result);
    return NextResponse.json({ ...result, generatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate inspiration", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
