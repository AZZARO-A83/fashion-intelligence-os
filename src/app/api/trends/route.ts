import { NextResponse } from "next/server";
import { generateLiveTrends } from "@/lib/live-research";
import { getCachedReport, setCachedReport, CACHE_KEYS } from "@/lib/cache";

export const maxDuration = 60;

const SOURCE_NOISE = /\b(beauty|makeup|make-up|cosmetic|cosmetics|lipstick|lip stick|lip gloss|mascara|foundation|skincare|skin care|perfume|fragrance|haircut|hair color|nails?|politics|war|refugee|deportation|travel alert|tourism|monorail|museum|ancient|pharaoh|football|weather|transport)\b/i;
const APPAREL_SIGNAL = /\b(fashion|style|outfit|wear|clothing|apparel|collection|dress|shirt|polo|tee|t-shirt|trouser|pants|jeans|chino|blazer|suit|jacket|skirt|blouse|top|co-ord|set|abaya|kaftan|linen|cotton|denim|viscose|silk|chiffon|modest|menswear|womenswear|summer|sahel|ملابس|لبس|موضة|ستايل|فستان|قميص|تيشيرت|بولو|بنطلون|جينز|بلوزة|توب|جيبة|بدلة|بليزر|كتان|قطن|صيف)\b/i;

function cleanCachedSources(sources: unknown[]) {
  return (sources as any[]).filter((s) => {
    const text = `${s?.title || ""} ${s?.summary || ""}`;
    return APPAREL_SIGNAL.test(text) && !SOURCE_NOISE.test(text);
  });
}

// GET — return the last generated live trends + sources (cached, no tokens).
export async function GET() {
  const cached = await getCachedReport<{
    trends: unknown[]; sources: unknown[];
    demandMap?: unknown[]; rejected?: unknown[]; backlog?: unknown[];
  }>(CACHE_KEYS.trends);
  return NextResponse.json({
    trends: cached?.data?.trends ?? [],
    sources: cleanCachedSources(cached?.data?.sources ?? []),
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
