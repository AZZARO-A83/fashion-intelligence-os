// ─── Market Demand API ────────────────────────────────────────────────
// Pure consumer search signal — completely independent of what Debackers carries.
// Step 1: fetch Debackers product types from Shopify (what they have)
// Step 2: add known opportunity garments not in catalog
// Step 3: query Google autocomplete for each → real market demand
// Step 4: extract fabric signals from those results
// Step 5: flag each garment as "in catalog" or "gap/opportunity"
// Cache: 24h — runs once per day, zero AI tokens, zero Serper credits.

import { NextResponse } from "next/server";
import { getGenderedDemand } from "@/lib/search-demand";
import { getCachedReport, setCachedReport } from "@/lib/cache";

const SHOPIFY_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export const maxDuration = 60;

const CACHE_KEY = "live:market-demand:v1";
const TTL = 24 * 60 * 60; // 24h

// ─── Garment definition ───────────────────────────────────────────────
export interface GarmentDemand {
  id: string;
  label: string;         // display name
  searchSeed: string;    // what we query Google with
  gender: "men" | "women" | "both";
  inCatalog: boolean;    // Debackers carries this
  score: number;         // total autocomplete hits across all angles
  heatLevel: 1 | 2 | 3;
  topSearches: string[]; // top 6 raw autocomplete results (real consumer phrases)
  fabrics: { fabric: string; count: number }[];
}

export interface MarketDemandResult {
  garments: GarmentDemand[];
  generatedAt: string;
  totalSignals: number;
}

// ─── Fabrics to detect ────────────────────────────────────────────────
const FABRICS = [
  "bamboo","linen","cotton","denim","viscose","chiffon","silk",
  "wool","jersey","poplin","modal","tencel","rayon","satin",
  "polyester","tweed","suede","leather","knit","knitwear",
];

function extractFabrics(terms: string[]): { fabric: string; count: number }[] {
  const counts: Record<string, number> = {};
  const text = terms.join(" ").toLowerCase();
  for (const f of FABRICS) {
    const hits = (text.match(new RegExp(`\\b${f}\\b`, "g")) || []).length;
    if (hits > 0) counts[f] = hits;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([fabric, count]) => ({ fabric, count }));
}

// ─── Normalise Shopify product types → search seeds ───────────────────
// Maps raw Shopify productType values to a canonical garment config.
const SHOPIFY_TYPE_MAP: Record<string, { id: string; label: string; searchSeed: string; gender: "men" | "women" | "both" }> = {
  // Men
  "shirts":         { id: "shirt-men",        label: "Shirt",          searchSeed: "shirt men",        gender: "men" },
  "t-shirt":        { id: "tee-men",           label: "T-Shirt",        searchSeed: "t-shirt men",      gender: "men" },
  "pants":          { id: "pants-men",         label: "Trousers",       searchSeed: "trouser men",      gender: "men" },
  "pullover":       { id: "pullover-men",      label: "Pullover",       searchSeed: "pullover men",     gender: "men" },
  "knitwear vest":  { id: "knit-vest-men",     label: "Knit Vest",      searchSeed: "knit vest men",    gender: "men" },
  "vest sweater":   { id: "sweater-vest-men",  label: "Sweater Vest",   searchSeed: "sweater vest men", gender: "men" },
  "knitwear jacket":{ id: "knit-jacket-men",   label: "Knitwear Jacket",searchSeed: "knitwear jacket men", gender: "men" },
  "blazer":         { id: "blazer-men",        label: "Blazer",         searchSeed: "blazer men",       gender: "men" },
  "suits":          { id: "suit-men",          label: "Suit",           searchSeed: "suit men",         gender: "men" },
  // Women
  "womens shirts":  { id: "shirt-women",       label: "Shirt",          searchSeed: "shirt women",      gender: "women" },
  "womens t-shirts":{ id: "tee-women",         label: "T-Shirt",        searchSeed: "t-shirt women",    gender: "women" },
  "womens pants":   { id: "pants-women",       label: "Trousers",       searchSeed: "trouser women",    gender: "women" },
  "dresses":        { id: "dress-women",       label: "Dress",          searchSeed: "dress women",      gender: "women" },
  "blouse":         { id: "blouse-women",      label: "Blouse",         searchSeed: "blouse women",     gender: "women" },
  "skirts":         { id: "skirt-women",       label: "Skirt",          searchSeed: "skirt women",      gender: "women" },
  "sets":           { id: "set-women",         label: "Co-ord Set",     searchSeed: "co-ord set women", gender: "women" },
};

// ─── Opportunity garments NOT in Debackers catalog ────────────────────
// These are added so we can surface gaps / new product opportunities.
const OPPORTUNITY_GARMENTS: Omit<GarmentDemand, "score" | "heatLevel" | "topSearches" | "fabrics" | "inCatalog">[] = [
  { id: "polo-men",      label: "Polo",        searchSeed: "polo shirt men",   gender: "men" },
  { id: "jeans-men",     label: "Jeans",       searchSeed: "jeans men",        gender: "men" },
  { id: "shorts-men",    label: "Shorts",      searchSeed: "shorts men",       gender: "men" },
  { id: "jacket-men",    label: "Jacket",      searchSeed: "jacket men",       gender: "men" },
  { id: "cardigan-men",  label: "Cardigan",    searchSeed: "cardigan men",     gender: "men" },
  { id: "kaftan-both",   label: "Kaftan",      searchSeed: "kaftan",           gender: "both" },
  { id: "abaya-women",   label: "Abaya",       searchSeed: "abaya women",      gender: "women" },
  { id: "jumpsuit-women",label: "Jumpsuit",    searchSeed: "jumpsuit women",   gender: "women" },
  { id: "midi-women",    label: "Midi Dress",  searchSeed: "midi dress women", gender: "women" },
  { id: "jeans-women",   label: "Jeans",       searchSeed: "jeans women",      gender: "women" },
];

// ─── Fetch all unique Shopify product types ───────────────────────────
async function fetchShopifyProductTypes(): Promise<Set<string>> {
  const types = new Set<string>();
  let cursor: string | null = null;

  for (let page = 0; page < 20; page++) {
    const paginationArg: string = cursor ? `, after: "${cursor}"` : "";
    const query = `{ products(first: 50${paginationArg}) { edges { node { productType } } pageInfo { hasNextPage endCursor } } }`;

    const res = await fetch(`https://${SHOPIFY_URL}/admin/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_TOKEN!,
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    const products = data?.data?.products;
    if (!products) break;

    for (const { node } of products.edges) {
      const t = (node.productType || "").trim().toLowerCase();
      if (t && t !== "outlet" && t !== "accessories") types.add(t);
    }

    if (!products.pageInfo.hasNextPage) break;
    cursor = products.pageInfo.endCursor;
  }

  return types;
}

// ─── Main handler ─────────────────────────────────────────────────────
export async function GET() {
  const cached = await getCachedReport<MarketDemandResult>(CACHE_KEY);
  if (cached?.data?.garments?.length) return NextResponse.json(cached.data);
  return NextResponse.json({ garments: [], generatedAt: null, totalSignals: 0 });
}

export async function POST() {
  try {
    // Step 1 — Get real Shopify product types
    const shopifyTypes = await fetchShopifyProductTypes();

    // Step 2 — Build garment list from catalog
    const catalogGarments: Omit<GarmentDemand, "score" | "heatLevel" | "topSearches" | "fabrics">[] = [];
    const seenIds = new Set<string>();

    for (const rawType of shopifyTypes) {
      const config = SHOPIFY_TYPE_MAP[rawType];
      if (!config || seenIds.has(config.id)) continue;
      seenIds.add(config.id);
      catalogGarments.push({ ...config, inCatalog: true });
    }

    // Step 3 — Add opportunity garments (not in catalog), cap total at 28
    const allGarments: Omit<GarmentDemand, "score" | "heatLevel" | "topSearches" | "fabrics">[] = [...catalogGarments];
    for (const opp of OPPORTUNITY_GARMENTS) {
      if (allGarments.length >= 28) break;
      if (!seenIds.has(opp.id)) {
        allGarments.push({ ...opp, inCatalog: false });
        seenIds.add(opp.id);
      }
    }

    // Step 4 — Query autocomplete in batches of 5 to avoid rate limiting
    const results: GarmentDemand[] = [];
    const BATCH = 5;

    for (let i = 0; i < allGarments.length; i += BATCH) {
      const batch = allGarments.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map(async (g) => {
          const { men, women } = await getGenderedDemand(g.searchSeed, 12);
          const allTerms = [...men, ...women];
          const score = allTerms.length;
          const fabrics = extractFabrics(allTerms);
          // Top 6 most relevant phrases (deduplicated)
          const seen = new Set<string>();
          const topSearches = allTerms.filter((t) => {
            const k = t.toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          }).slice(0, 6);

          return { ...g, score, topSearches, fabrics, heatLevel: 1 as 1 | 2 | 3 };
        })
      );
      results.push(...batchResults);
    }

    // Step 5 — Rank by score, assign heat levels
    results.sort((a, b) => b.score - a.score);
    const max = results[0]?.score || 1;
    for (const g of results) {
      g.heatLevel = g.score >= max * 0.6 ? 3 : g.score >= max * 0.3 ? 2 : 1;
    }

    const payload: MarketDemandResult = {
      garments: results,
      generatedAt: new Date().toISOString(),
      totalSignals: results.reduce((s, g) => s + g.score, 0),
    };

    await setCachedReport(CACHE_KEY, payload, TTL);
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[Market Demand API]", err);
    return NextResponse.json(
      { error: "Failed", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
