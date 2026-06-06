// ─── Search Demand Engine ─────────────────────────────────────────────
// Surfaces what Egyptian men + women ACTUALLY type into Google — ranked list.
// Uses two sources:
//   1. Serper relatedSearches (broad fashion queries → real Google signals)
//   2. Google autocomplete via topDemand (free, no Serper credits)
// No Groq AI tokens used. Cache: 12h.

import { getSerperDynamicSearchSignals } from "./tavily";
import { getShopifyProductImages, ShopifyProductImage } from "./shopify";

export interface DemandTerm {
  rank: number;
  query: string;
  score: number;
  heatLevel: 1 | 2 | 3;
  matchedProduct?: { title: string; image: string; url: string; price: string };
}

export interface FabricSignal {
  fabric: string;
  mentions: number;
  rank: number;
}

export interface SearchDemandResult {
  men: DemandTerm[];
  women: DemandTerm[];
  fabrics: FabricSignal[];
  generatedAt: string;
}

// ─── Fabric keyword list ──────────────────────────────────────────────
const FABRICS = [
  "linen","cotton","denim","bamboo","silk","viscose","chiffon",
  "wool","polyester","jersey","poplin","tweed","modal","tencel",
  "rayon","satin","suede","leather","nylon","spandex",
];

// ─── Helpers ─────────────────────────────────────────────────────────
function extractFabrics(allTerms: string[]): FabricSignal[] {
  const counts: Record<string, number> = {};
  const combined = allTerms.join(" ").toLowerCase();
  for (const fabric of FABRICS) {
    const hits = (combined.match(new RegExp(`\\b${fabric}\\b`, "gi")) || []).length;
    if (hits > 0) counts[fabric] = hits;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([fabric, mentions], i) => ({ fabric, mentions, rank: i + 1 }));
}

function matchProduct(
  query: string,
  products: ShopifyProductImage[]
): ShopifyProductImage | undefined {
  const stop = new Set(["egypt","2026","men","women","man","woman","for","the","and","buy","shop"]);
  const qWords = new Set(
    query.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !stop.has(w))
  );
  if (!qWords.size) return undefined;
  let best: ShopifyProductImage | undefined;
  let bestScore = 0;
  for (const p of products) {
    const pWords = p.title.toLowerCase().split(/\s+/);
    const overlap = pWords.filter((w) => qWords.has(w)).length;
    if (overlap > bestScore) { bestScore = overlap; best = p; }
  }
  return bestScore >= 1 ? best : undefined;
}

function scoreTerms(signals: string[]): { phrase: string; score: number }[] {
  // signals are already ordered best-first by Google; score by position
  return signals.map((phrase, i) => ({
    phrase,
    score: Math.round((1 / (i + 1)) * 100) / 100,
  }));
}

function heatLevel(score: number, max: number): 1 | 2 | 3 {
  if (score >= max * 0.6) return 3;
  if (score >= max * 0.3) return 2;
  return 1;
}

// ─── Main export ──────────────────────────────────────────────────────
export async function generateSearchDemand(): Promise<SearchDemandResult> {
  const [dynamicSignals, products] = await Promise.all([
    getSerperDynamicSearchSignals(),
    getShopifyProductImages(60),
  ]);

  const cast = products as ShopifyProductImage[];

  const buildList = (signals: string[]): DemandTerm[] => {
    const scored = scoreTerms(signals.slice(0, 10));
    const max = scored[0]?.score || 1;
    return scored.map((t, i) => ({
      rank: i + 1,
      query: t.phrase,
      score: t.score,
      heatLevel: heatLevel(t.score, max),
      matchedProduct: matchProduct(t.phrase, cast),
    }));
  };

  const men = buildList(dynamicSignals.menSignals);
  const women = buildList(dynamicSignals.womenSignals);

  const allTerms = [
    ...dynamicSignals.menSignals,
    ...dynamicSignals.womenSignals,
    ...dynamicSignals.generalSignals,
  ];
  const fabrics = extractFabrics(allTerms);

  return { men, women, fabrics, generatedAt: new Date().toISOString() };
}
