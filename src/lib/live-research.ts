// ─── Live Research Engine ─────────────────────────────────────────────
// Turns the previously-hardcoded research features (Trends, Competitors,
// Campaigns) into REAL live data: Tavily web search → Groq analysis.
// Every generator is cached by its route so it stays inside the free budget.

import { callClaude } from "./claude-api";
import { buildSystemPrompt } from "./egyptian-context";
import {
  searchEgyptianFashionTrends,
  searchCompetitorActivity,
  searchEgyptianInfluencers,
  searchMarketIntelligence,
  collectSources,
  getSerperDynamicSearchSignals,
  Source,
} from "./tavily";
import { RichTrend } from "./trend-engine";
import { getShopifyProductImages } from "./shopify";
import { getGenderedDemand } from "./search-demand";

export type { Source };

// ─── REFINE STEP ──────────────────────────────────────────────────────
// Tavily pulls wide. We only want signals about NEW colours, fabrics, and
// clothing types — not celebrity galas, red carpets, heritage essays, museum
// pieces, or award nights. Drop those before they ever reach the model.
const JUNK = /\b(red carpet|celebrit|gala|award|cannes|oscar|festival|museum|gallery|heritage|ancient|pharaoh|history|wedding of|royal|met gala|premiere)\b/i;
const FASHION = /\b(colou?r|fabric|linen|cotton|denim|wool|silk|trouser|pant|chino|shirt|tee|polo|blazer|jacket|coat|knit|dress|skirt|abaya|kaftan|suit|collection|new arrival|silhouette|tailor|outfit|style|trend|wide.?leg|oversized|beige|stone|olive|navy|earth tone)\b/i;

function refineSources(sources: Source[]): Source[] {
  const kept = sources.filter((s) => {
    const text = `${s.title} ${s.summary}`;
    // Keep if it talks about real garments/colours/fabrics AND isn't pure culture noise.
    if (FASHION.test(text) && !JUNK.test(text)) return true;
    // Borderline: has fashion words but also a junk word → keep only if fashion is strong.
    if (FASHION.test(text)) return (text.match(FASHION) || []).length >= 1 && !/^.*\b(award|gala|cannes|red carpet)\b/i.test(s.title);
    return false;
  });
  // Never starve the model — if the filter is too aggressive, fall back to originals.
  return kept.length >= 3 ? kept : sources;
}

function parseJson<T>(text: string): T {
  // Strip code fences / stray prose, grab the outermost JSON.
  const cleaned = text.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}

// ─── LIVE TRENDS ──────────────────────────────────────────────────────
export interface LiveTrendsResult {
  trends: RichTrend[];
  sources: Source[];
}

export async function generateLiveTrends(): Promise<LiveTrendsResult> {
  // ── Three parallel data pulls ─────────────────────────────────────────
  // Layer 1 — INFLUENCE: Egyptian influencers / creators / editorial leading trends
  // Layer 2 — SEARCH DEMAND: live Serper relatedSearches + broad customer queries
  // Also: Shopify catalog for product matching
  const [influenceSources, demandSources, dynamicSignals, products] = await Promise.all([
    // ── INFLUENCE LAYER — 15-20 sources ─────────────────────────────────
    collectSources([
      { q: "Egyptian fashion influencers men women 2026 trending outfits مؤثرين موضة مصر", days: 21, domains: null },
      { q: "Egypt TikTok Instagram fashion creators style new collection 2026", days: 14, domains: null },
      { q: "Egyptian style leaders premium editorial menswear womenswear 2026", days: 30 },
      { q: "مؤثرات مؤثرين مصر موضة ملابس رجالي نسائي 2026 ستايل جديد", days: 21, domains: null },
      { q: "Egypt fashion week designers local brand new style summer 2026", days: 30, domains: null },
    ]),
    // ── SEARCH DEMAND LAYER — 15-20 sources across diverse garment types ─
    collectSources([
      { q: "men Egypt fashion buy 2026 polo shirt chino suit blazer jacket", days: 30, domains: null },
      { q: "women Egypt fashion buy 2026 maxi midi dress co-ord set jumpsuit", days: 30, domains: null },
      { q: "Egyptian street style what people wearing Cairo summer 2026", days: 21, domains: null },
      { q: "Egypt clothing trending now new arrivals men women 2026 براندات", days: 21, domains: null },
      { q: "Egyptian fashion market bestselling garments colours fabrics 2026", days: 30, domains: null },
      { q: "Egypt North Coast Sahel summer fashion outfit men women 2026", days: 14, domains: null },
    ]),
    // ── DYNAMIC SIGNALS — live relatedSearches from Google via Serper ────
    getSerperDynamicSearchSignals(),
    getShopifyProductImages(40),
  ]);

  // Refine each layer independently — keep signal identity clean
  const influenceFiltered = refineSources(influenceSources);
  const demandFiltered = refineSources(demandSources);

  // Build labeled blocks for the AI prompt
  const influenceText = influenceFiltered.length
    ? influenceFiltered.map((s, i) => `[I${i + 1}] ${s.title}: ${s.summary}`).join("\n")
    : "No influencer signals found — rely on search demand layer.";

  const demandText = demandFiltered.length
    ? demandFiltered.map((s, i) => `[S${i + 1}] ${s.title}: ${s.summary}`).join("\n")
    : "No search demand signals found — rely on influence layer.";

  // Dynamic signals from Serper relatedSearches — real-time customer intent
  const dynMen = dynamicSignals.menSignals.slice(0, 15).join(" | ");
  const dynWomen = dynamicSignals.womenSignals.slice(0, 15).join(" | ");
  const dynGeneral = dynamicSignals.generalSignals.slice(0, 10).join(" | ");
  const dynamicText = [
    dynMen ? `Men searching: ${dynMen}` : "",
    dynWomen ? `Women searching: ${dynWomen}` : "",
    dynGeneral ? `General: ${dynGeneral}` : "",
  ].filter(Boolean).join("\n") || "No dynamic signals available.";

  const productList = products.length ? products.map((p) => `${p.title} (${p.type})`).join("; ") : "(none)";
  const allSources = [...influenceFiltered, ...demandFiltered];

  // Pre-assign fabric slots so the AI cannot repeat linen/beige across all trends.
  // 6 fabric slots — linen is only allowed ONCE (slot 6), and only if signals actually support it.
  const FABRIC_SLOTS = [
    "SLOT A (Trend 1): PRIMARY fabric = COTTON or DENIM — no linen, no beige as primary colour",
    "SLOT B (Trend 2): PRIMARY fabric = VISCOSE, CHIFFON, or SILK — no linen, no beige",
    "SLOT C (Trend 3): PRIMARY fabric = DENIM, JERSEY, or POPLIN — no linen",
    "SLOT D (Trend 4): PRIMARY fabric = BAMBOO, MODAL, or TENCEL — no linen",
    "SLOT E (Trend 5): PRIMARY fabric = WOOL, TWEED, or COTTON-BLEND — no linen",
    "SLOT F (Trend 6): PRIMARY fabric = LINEN is ALLOWED here ONLY if search data supports it — otherwise use COTTON or POPLIN",
  ].join("\n");

  const prompt = `You are a strict Egypt fashion-trend RADAR for DEBACKERS (premium men+women). Evidence-based only. Never invent.

You have THREE signal sources. Use ALL THREE and label each trend's primary driver.

LAYER 1 — INFLUENCE [I prefix]: Egyptian influencers, creators, editorial — what they're actively promoting. Drives future demand.
LAYER 2 — SEARCH DEMAND [S prefix]: What Egyptians type into Google right now — web articles + brand pages. Current buying intent.
LAYER 3 — LIVE CUSTOMER SEARCHES: Real-time related searches from Google — exactly what men and women are typing this week.

FOCUS ONLY ON WEARABLE FASHION: specific GARMENTS + COLOURS + FABRICS + SILHOUETTES for men and women.
IGNORE: celebrities, red carpets, heritage, history, museums, culture essays — pure noise.

=== LAYER 1 — INFLUENCE SIGNALS ===
${influenceText}
=== END LAYER 1 ===

=== LAYER 2 — SEARCH DEMAND SIGNALS ===
${demandText}
=== END LAYER 2 ===

=== LAYER 3 — LIVE CUSTOMER SEARCHES (what Egyptians type RIGHT NOW) ===
${dynamicText}
=== END LAYER 3 ===

=== DEBACKERS REAL PRODUCTS (match ONLY from this exact list) ===
${productList}
=== END ===

━━━ MANDATORY FABRIC ASSIGNMENTS — FOLLOW EXACTLY ━━━
You MUST produce exactly 6 trends. Each trend is assigned a fabric slot below.
This is NOT a suggestion — it is a hard requirement:
${FABRIC_SLOTS}

━━━ STRICT DIVERSITY RULES (ENFORCE — no exceptions) ━━━
1. Each trend MUST be a DIFFERENT garment type. No garment type can repeat across trends.
   Valid garment types: shirt, trouser/chino, dress, blazer/jacket, polo, co-ord set, jumpsuit, suit, coat, skirt, abaya, shorts.
2. BALANCE: ≥2 men's trends, ≥2 women's trends across the 6.
3. The word "beige" can appear as a SECONDARY colour detail but CANNOT be the first word in any trend name.
4. TREND NAME FORMAT: Start with the GARMENT TYPE, then add one differentiating detail.
   GOOD: "Wide-Leg Cotton Chino — Olive & Stone" | "Wrap Viscose Midi Dress — Deep Olive"
   BAD: "Beige Chino" | "Linen Blend Shirt" | "Summer Style"
5. If Layer 3 shows Egyptians searching for polo shirts, chinos, blazers, jumpsuits — those ARE trends even if Layer 1/2 don't mention them. Trust Layer 3.

━━━ OUTPUT RULES ━━━
- "signalLayer": MUST be set — "influence" / "search-demand" / "both". Never omit this field.
- "sourceIndex": e.g. "I2" (influence), "S3" (demand web), "L3" (live search). Use "both" if multiple layers confirm.
- BE SPECIFIC: "women's floral wrap midi dress" not "summer fashion".
- evidenceStrength: "strong" = 2+ layers confirm; "medium" = 1 layer solid; "weak" = single weak signal.
- "productMatches": 1-4 EXACT product titles from the list above, or []. STRICT: garment type must match exactly — polo trend → only polo products, shirt trend → only shirt products, dress → dress only. NEVER match a shirt to a polo trend or a polo to a shirt trend.
- recommendedAction: "campaign push" | "small stock test" | "content only" | "avoid".

Return ONLY a JSON array of 6 trends (exactly 6):
[{
  "id":"kebab-case","name":"Specific Trend Name","arabicName":"اسم بالعربي","gender":"men|women|unisex",
  "signalLayer":"influence|search-demand|both",
  "platform":"tiktok|instagram|google|multi","category":"aesthetic|color|style|product|occasion",
  "trendScore":78,"growthRate":25,"relevanceScore":80,"confidenceScore":70,"expectedPeakDays":14,"survivalRate":60,
  "searchSeed":"2-4 word English search keyword, e.g. wide leg chino men",
  "evidenceStrength":"strong|medium|weak",
  "signalsVerified":["specific verified signal from a layer"],
  "signalsMissing":["buying-intent comments not accessible","no Google Trends volume"],
  "recommendedAction":"campaign push|small stock test|content only|avoid",
  "sourceIndex":"I1|S2|L3|both",
  "signals":[{"source":"influence|search-demand|live-search","metric":"","value":"","weight":80,"direction":"up"}],
  "competitorReaction":{"tieHouse":"","britishHouse":"","massimoDutti":"","gap":""},
  "productMatches":["exact product title"],
  "catalogMatch":{"readiness":"ready|partial|needs-sourcing","urgency":"act-now|prepare|monitor"},
  "contentPrescription":{"format":["reel"],"hook":"Egyptian Arabic hook","hashtags":["#tag"],"sounds":["..."],"bestTime":"8-11pm"},
  "description":"Gender + specific garment + colour + fabric — which layer confirmed it"
}]
Return ONLY the JSON array. Exactly 6 items. Fabric slots A-F assigned above. All different garment types.`;

  const text = await callClaude(buildSystemPrompt(), prompt, 5000);
  const raw = parseJson<any[]>(text);
  const byTitle = new Map(products.map((p) => [p.title.toLowerCase().trim(), p]));

  // Post-processing: enforce name format (garment-first) and fabric diversity.
  // If the AI still starts a name with a color (Beige X, Linen X), restructure it.
  const COLOR_FIRST = /^(beige|linen|white|black|navy|olive|stone|sand|cream|khaki|grey|gray)\s+/i;
  const fabricCount: Record<string, number> = {};
  const normalizeNames = (arr: any[]) => arr.map((t) => {
    if (COLOR_FIRST.test(t.name || "")) {
      const parts = (t.name as string).split(/\s+/);
      // Move color to end: "Beige Linen Chino" → "Linen Chino — Beige"
      const color = parts[0];
      const rest = parts.slice(1).join(" ");
      t.name = `${rest} — ${color}`;
    }
    return t;
  });
  normalizeNames(raw);

  const trends = raw.map((t, i) => {
    const trend = normalizeTrend(t, i);
    // Source attribution: "I2" → influenceFiltered[1], "S3" → demandFiltered[2]
    const ref = String(t.sourceIndex || "");
    const layerMatch = ref.match(/^([IS])(\d+)$/i);
    if (layerMatch) {
      const pool = layerMatch[1].toUpperCase() === "I" ? influenceFiltered : demandFiltered;
      const idx = Number(layerMatch[2]) - 1;
      if (idx >= 0 && idx < pool.length) {
        trend.evidenceTitle = pool[idx].title;
        trend.evidenceUrl = pool[idx].url;
      }
    }
    // Attach REAL products (only ones that actually exist in the catalog).
    const matches = (Array.isArray(t.productMatches) ? t.productMatches : [])
      .map((name: string) => byTitle.get(String(name).toLowerCase().trim()))
      .filter(Boolean)
      .slice(0, 4)
      .map((p: any) => ({ title: p.title, image: p.image, url: p.url, price: p.price }));
    trend.matchedProducts = matches;
    trend.searchSeed = (t.searchSeed || trend.name || "").toString().slice(0, 40);
    // signalLayer: always set — never let it be empty
    trend.signalLayer = (["influence", "search-demand", "both"] as const).includes(t.signalLayer)
      ? t.signalLayer as "influence" | "search-demand" | "both"
      : t.sourceIndex?.startsWith?.("I") ? "influence"
      : t.sourceIndex?.startsWith?.("S") ? "search-demand"
      : "both";
    return trend;
  });

  // 🔍 SEARCHED ABOUT — real consumer demand, split MEN vs WOMEN, top ~18 each
  // (free autocomplete, parallel). These reveal the colours/fabrics/types people type.
  await Promise.all(
    trends.map(async (trend) => {
      const seed = trend.searchSeed || trend.name || "";
      if (!seed) {
        trend.searchDemandMen = [];
        trend.searchDemandWomen = [];
        return;
      }
      const { men, women } = await getGenderedDemand(seed, 18);
      trend.searchDemandMen = men;
      trend.searchDemandWomen = women;
      // keep the flat list too (back-compat / quick glance)
      trend.searchDemand = [...men.slice(0, 3), ...women.slice(0, 3)];
    })
  );

  return { trends, sources: allSources };
}

// Fill any fields the model omitted so the UI never crashes on undefined.
function normalizeTrend(t: any, i: number): RichTrend {
  return {
    id: t.id || `trend-${i}`,
    name: t.name || "Untitled trend",
    arabicName: t.arabicName || "",
    platform: t.platform || "multi",
    category: t.category || "style",
    trendScore: Number(t.trendScore) || 0,
    growthRate: Number(t.growthRate) || 0,
    relevanceScore: Number(t.relevanceScore) || 0,
    confidenceScore: Number(t.confidenceScore) || 0,
    expectedPeakDays: Number(t.expectedPeakDays) || 0,
    survivalRate: Number(t.survivalRate) || 0,
    signals: Array.isArray(t.signals) ? t.signals : [],
    historicalMatch: t.historicalMatch || "",
    lastYearOutcome: t.lastYearOutcome || "",
    competitorReaction: {
      tieHouse: t.competitorReaction?.tieHouse || "—",
      britishHouse: t.competitorReaction?.britishHouse || "—",
      massimoDutti: t.competitorReaction?.massimoDutti || "—",
      gap: t.competitorReaction?.gap || "—",
    },
    catalogMatch: {
      products: t.catalogMatch?.products ?? [],
      readiness: t.catalogMatch?.readiness || "partial",
      urgency: t.catalogMatch?.urgency || "monitor",
    },
    contentPrescription: {
      format: t.contentPrescription?.format ?? [],
      hook: t.contentPrescription?.hook || "",
      hashtags: t.contentPrescription?.hashtags ?? [],
      sounds: t.contentPrescription?.sounds,
      bestTime: t.contentPrescription?.bestTime || "8–11pm",
    },
    description: t.description || "",
    gender: t.gender === "men" || t.gender === "women" ? t.gender : "unisex",
    signalLayer: (["influence", "search-demand", "both"] as const).includes(t.signalLayer) ? t.signalLayer : "both",
    evidenceStrength: ["strong", "medium", "weak"].includes(t.evidenceStrength) ? t.evidenceStrength : "weak",
    signalsVerified: Array.isArray(t.signalsVerified) ? t.signalsVerified : [],
    signalsMissing: Array.isArray(t.signalsMissing) ? t.signalsMissing : ["buying-intent comments not accessible", "no Google Trends volume available"],
    recommendedAction: t.recommendedAction || "content only",
  };
}

// ─── LIVE COMPETITORS ─────────────────────────────────────────────────
import { CompetitorIntelligence } from "./competitor-intelligence";

export interface LiveCompetitorReport {
  competitors: CompetitorIntelligence[];
  marketGaps: string[];
  sources: Source[];
}

export async function generateLiveCompetitors(): Promise<LiveCompetitorReport> {
  const [competitors, sources] = await Promise.all([
    searchCompetitorActivity(),
    collectSources([
      { q: "Tie House Egypt fashion 2026 campaign collection", days: 30 },
      { q: "British House Egypt fashion shirts 2026", days: 30 },
      { q: "Massimo Dutti Egypt 2026 collection", days: 30 },
      { q: "Egyptian premium fashion brands 2026 competition", days: 30 },
    ]),
  ]);

  const prompt = `You are a competitive intelligence analyst for DEBACKERS Egypt (premium men+women fashion, Belgian heritage 1986).
Using the LIVE web search results below, analyze Debackers' real competitors RIGHT NOW.

=== LIVE COMPETITOR SEARCH ===
${competitors}
=== END ===

Return ONLY this JSON:
{
  "competitors": [{
    "name": "Tie House",
    "website": "tiehouse.ae",
    "insights": ["3-5 specific things they are doing now, from the search"],
    "contentThemes": ["theme1","theme2"],
    "pricingStrategy": "their pricing approach vs Debackers",
    "gaps": ["2-3 openings Debackers can exploit"],
    "threatLevel": "high|medium|low"
  }],
  "marketGaps": ["overall opening 1","opening 2","opening 3","opening 4"]
}
Cover Tie House, British House, Massimo Dutti Egypt, plus any other premium Egyptian brand the search surfaced. Return ONLY the JSON.`;

  const text = await callClaude(buildSystemPrompt(), prompt, 4000);
  const raw = parseJson<{ competitors: any[]; marketGaps: string[] }>(text);
  const competitorsOut: CompetitorIntelligence[] = (raw.competitors ?? []).map((c) => ({
    name: c.name || "Competitor",
    website: c.website || "",
    metaAdsUrl: "",
    insights: Array.isArray(c.insights) ? c.insights : [],
    campaigns: [],
    contentThemes: Array.isArray(c.contentThemes) ? c.contentThemes : [],
    pricingStrategy: c.pricingStrategy || "",
    gaps: Array.isArray(c.gaps) ? c.gaps : [],
    threatLevel: c.threatLevel || "medium",
    lastUpdated: new Date().toISOString(),
  }));
  return { competitors: competitorsOut, marketGaps: raw.marketGaps ?? [], sources };
}

// ─── LIVE TREND ALERTS ────────────────────────────────────────────────
import { TrendAlert } from "./trend-alerts";

export interface LiveAlertsResult {
  alerts: TrendAlert[];
  sources: Source[];
}

export async function generateLiveAlerts(): Promise<LiveAlertsResult> {
  // DISTINCT identity: alerts hunt what's SPIKING/NEW this week (not the broad
  // current trends the Trend Engine covers). Its own sources, men + women.
  const sources = await collectSources([
    { q: "Egypt men's fashion rising trend this week 2026 رجالي", days: 7 },
    { q: "Egypt women's fashion viral new 2026 نسائي", days: 7 },
    { q: "Egyptian fashion news what's new 2026", days: 10, topic: "news" },
  ]);
  const searchText = sources.length
    ? sources.map((s) => `- ${s.title}: ${s.summary}`).join("\n")
    : "No fresh signals found this week.";

  const prompt = `You are a trend-alert system for DEBACKERS Egypt (premium MEN + WOMEN fashion).
From the LIVE signals below, surface the 4 FASTEST-RISING / NEWEST things that need action now.

=== LIVE SIGNALS THIS WEEK (your only source) ===
${searchText}
=== END ===

Rules:
- Each alert must trace to a signal above (put it in "signals").
- BE SPECIFIC: name the garment + colour + silhouette (e.g. "men's pleated wide-leg trouser in stone"). NOT "summer fashion".
- Balance MEN and WOMEN — at least 1 men's and 1 women's alert.

Return ONLY a JSON array of 4 alerts:
[{
  "trendName":"", "arabicName":"", "platform":"tiktok|instagram|multi", "category":"aesthetic|color|style|product|occasion",
  "currentScore":85, "growthRate":40, "priority":"urgent|high|medium|watch",
  "signals":["data point from the search"], "relevanceToDebackers":"why it matters (men or women)",
  "suggestedAction":"specific move", "hook":"Arabic hook", "hashtags":["#tag"], "peakDaysEstimate":10
}]
Return ONLY the JSON array.`;

  const text = await callClaude(buildSystemPrompt(), prompt, 3500);
  const raw = parseJson<any[]>(text);
  const now = new Date().toISOString();
  const alerts: TrendAlert[] = raw.map((a, i) => ({
    id: `alert-${i}`,
    detectedAt: now,
    trendName: a.trendName || "Trend",
    arabicName: a.arabicName || "",
    platform: a.platform || "multi",
    category: a.category || "style",
    currentScore: Number(a.currentScore) || 0,
    previousScore: 0,
    scoreChange: Number(a.growthRate) || 0,
    growthRate: Number(a.growthRate) || 0,
    priority: a.priority || "medium",
    status: "new",
    source: "live web search",
    signals: Array.isArray(a.signals) ? a.signals : [],
    relevanceToDebackers: a.relevanceToDebackers || "",
    suggestedAction: a.suggestedAction || "",
    hook: a.hook || "",
    hashtags: Array.isArray(a.hashtags) ? a.hashtags : [],
    peakDaysEstimate: Number(a.peakDaysEstimate) || 0,
    isNew: true,
  }));
  return { alerts, sources };
}

// ─── LIVE INSPIRATION ─────────────────────────────────────────────────
export interface InspirationItem {
  title: string;
  description: string;
  colors: string[];        // hex codes
  mood: string;
  useFor: string;          // which Debackers products/campaigns
}
export interface LiveInspirationResult {
  boards: InspirationItem[];
  sources: Source[];
}

export async function generateLiveInspiration(): Promise<LiveInspirationResult> {
  // DISTINCT identity: visual/colour direction for the UPCOMING season, men + women.
  const sources = await collectSources([
    { q: "fashion colour palette autumn winter 2026 2027 trend forecast", days: 60 },
    { q: "menswear womenswear key colours silhouettes upcoming season 2026", days: 60 },
    { q: "Egypt fashion aesthetic mood 2026 editorial", days: 45 },
  ]);
  const searchText = sources.length
    ? sources.map((s) => `- ${s.title}: ${s.summary}`).join("\n")
    : "Use Egyptian seasonal context + premium aesthetics.";

  const prompt = `You are a creative director for DEBACKERS Egypt (premium MEN + WOMEN fashion).
Propose 4 visual mood boards for the UPCOMING season, grounded in the live signals below.

=== LIVE SIGNALS ===
${searchText}
=== END ===

Rules:
- Include BOTH men's and women's boards (at least 1 each).
- Name specific garments + silhouettes in the description (e.g. "men's relaxed wool overshirt", "women's bias-cut midi").
- Colours must be real hex codes that match the direction.

Return ONLY a JSON array of 4 boards:
[{
  "title":"Board name (say Men or Women)",
  "description":"visual direction naming specific garments + silhouettes, 1-2 sentences",
  "colors":["#hex1","#hex2","#hex3","#hex4"],
  "mood":"e.g. warm minimalist editorial",
  "useFor":"which Debackers products/campaigns this fits"
}]
Return ONLY the JSON array.`;

  const text = await callClaude(buildSystemPrompt(), prompt, 2500);
  const raw = parseJson<any[]>(text);
  const boards: InspirationItem[] = raw.map((b) => ({
    title: b.title || "Mood board",
    description: b.description || "",
    colors: Array.isArray(b.colors) ? b.colors : [],
    mood: b.mood || "",
    useFor: b.useFor || "",
  }));
  return { boards, sources };
}

// ─── LIVE CAMPAIGNS ───────────────────────────────────────────────────
export interface LiveCampaign {
  name: string;
  objective: string;
  audience: string;
  hook_ar: string;
  hook_en: string;
  format: string;
  timing: string;
  confidence: number;
  whyNow: string;
  products: string[];
}

export async function generateLiveCampaigns(salesSummary: string): Promise<LiveCampaign[]> {
  const [trends, market] = await Promise.all([
    searchEgyptianFashionTrends(),
    searchMarketIntelligence(),
  ]);

  const prompt = `You are a senior campaign strategist for DEBACKERS Egypt.
Build 4 ready-to-run campaigns using REAL live trends + the brand's REAL Shopify sales.

=== LIVE TREND SEARCH ===
${trends}

=== LIVE MARKET ===
${market}

=== REAL SHOPIFY SALES ===
${salesSummary}
=== END ===

Return ONLY a JSON array of 4 campaigns:
[{
  "name": "Campaign name",
  "objective": "what it achieves",
  "audience": "specific segment",
  "hook_ar": "Egyptian Arabic hook",
  "hook_en": "English hook",
  "format": "Reel|TikTok|Carousel|Story",
  "timing": "when to run",
  "confidence": 85,
  "whyNow": "tie to a real trend or real sales signal",
  "products": ["real product names from the sales data"]
}]
Tie each campaign to a real trend AND a real best-selling product. Return ONLY the JSON array.`;

  const text = await callClaude(buildSystemPrompt(), prompt, 4000);
  return parseJson<LiveCampaign[]>(text);
}
