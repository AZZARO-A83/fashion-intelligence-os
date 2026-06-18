// ─── Live Research Engine ─────────────────────────────────────────────
// Turns the previously-hardcoded research features (Trends, Competitors,
// Campaigns) into REAL live data: Serper web search → Groq analysis.
//
// TREND ENGINE (rebuilt): deterministic-first.
//   1. Probe real Egyptian search demand (autocomplete + Serper) for every
//      garment Debackers sells (men + women), plus opportunity probes.
//   2. CLASSIFY every raw query into structured layers BY CODE
//      (gender → garment → fabric → modifier → intent). The AI never sees
//      raw mixed text and never decides the garment type.
//   3. Build gender+garment CLUSTERS, score them, season-guard them.
//   4. Only then does Groq write the business copy for the top clusters.
// "jeans" is a garment. "denim" is a fabric. A jeans search can NEVER become
// a denim-jacket trend.

import { callClaude } from "./claude-api";
import { buildSystemPrompt } from "./egyptian-context";
import { getCachedReport, CACHE_KEYS } from "./cache";
import {
  searchEgyptianFashionTrends,
  searchMarketIntelligence,
  collectSources,
  getSerperDynamicSearchSignals,
  Source,
} from "./tavily";
import { RichTrend, DemandMapRow, RejectedRow, BacklogRow } from "./trend-engine";
import { getShopifyProductImages } from "./shopify";
import { fetchSuggestions } from "./search-demand";
import { GARMENTS, currentSeasonEgypt, detectGarment } from "./catalog-taxonomy";
import {
  classifySearchQuery, buildDemandClusters, scoreCluster, applySeasonGuard,
  buildTrendName, ClassifiedQuery, DemandCluster, ShopProduct,
} from "./query-classifier";
import type { SearchDemandResult } from "./search-demand-engine";
import { searchConsoleDemandSet, type SearchConsoleResult } from "./search-console";

export type { Source };

// ─── REFINE STEP (Layer 1/2 web sources for the Sources panel + article support) ─
const JUNK = /\b(red carpet|celebrit|gala|award|cannes|oscar|festival|museum|gallery|heritage|ancient|pharaoh|history|wedding of|royal|met gala|premiere|london fashion week|paris fashion week|milan fashion week|new york fashion week|uk fashion|british fashion|aw2[0-9]|autumn winter 202[0-9]|fw2[0-9]|winter coat|leather jacket|puffer|tweed|cashmere|fur coat|winter 202[0-9]|egypt safe|is egypt|safe to visit|travel guide|travel to egypt|egypt travel|egypt tourism|tourism in egypt|egypt tourist|life n style)\b/i;
const FASHION = /\b(colou?r|fabric|linen|cotton|denim|silk|trouser|pant|chino|shirt|tee|polo|blazer|jacket|dress|skirt|abaya|kaftan|suit|collection|new arrival|silhouette|tailor|outfit|style|trend|wide.?leg|oversized|beige|stone|olive|navy|earth tone|bamboo|modal|viscose|chiffon|poplin|jersey)\b/i;

function refineSources(sources: Source[]): Source[] {
  return sources.filter((s) => {
    const text = `${s.title} ${s.summary}`;
    if (FASHION.test(text) && !JUNK.test(text)) return true;
    if (FASHION.test(text)) return !/^.*\b(award|gala|cannes|red carpet)\b/i.test(s.title);
    return false;
  });
}

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}

const ARABIC_TEXT = /[\u0600-\u06FF]/;
const unique = (values: string[]) => values.filter((v, i, a) => !!v && a.indexOf(v) === i);

// ─── LIVE TRENDS (deterministic clusters → AI copy) ───────────────────────
export interface LiveTrendsResult {
  trends: RichTrend[];
  sources: Source[];
  demandMap: DemandMapRow[];
  rejected: RejectedRow[];
  backlog: BacklogRow[];
}

const MIN_SIGNALS = 3;     // a cluster needs ≥3 unique real searches to be a trend
const TOP_TRENDS = 8;      // how many clusters get AI copy + trend cards
const DEMAND_MAP_CAP = 24; // rows shown in the Search Demand Map

const GENDER_WORD: Record<"men" | "women", string> = { men: "men", women: "women" };
const AR_GENDER: Record<"men" | "women", string> = { men: "رجالي", women: "نسائي" };

const GARMENT_LABELS: Record<string, string> = {
  jeans: "Jeans", chino: "Chinos", pants: "Pants", shirt: "Shirts", overshirt: "Over-Shirt",
  polo: "Polo Shirts", tshirt: "T-Shirts", blazer: "Blazers", suit: "Suits", jacket: "Jackets",
  cardigan: "Cardigans", vest: "Vests", dress: "Dresses", skirt: "Skirts", blouse: "Blouses", top: "Tops",
  set: "Co-ord Sets", jumpsuit: "Jumpsuits", abaya: "Abayas", kaftan: "Kaftans", shorts: "Shorts",
  shoes: "Shoes", tie: "Ties", belt: "Belts", cufflink: "Cufflinks & Brooches", socks: "Socks",
  sweater: "Sweaters", hoodie: "Hoodies", coat: "Coats",
};
const label = (t: string) => GARMENT_LABELS[t] || t;

function cachedCustomerDemandQueries(result: SearchDemandResult | null | undefined): Set<string> {
  const queries = [
    ...(result?.men ?? []).map((x) => x.query),
    ...(result?.women ?? []).map((x) => x.query),
    ...(result?.fabrics ?? []).map((x) => x.fabric),
  ].filter(Boolean);
  return new Set(queries.map((q) => q.toLowerCase().trim()).filter(Boolean));
}

function mergeDemandSets(...sets: Set<string>[]): Set<string> {
  return new Set(sets.flatMap((set) => [...set]));
}

interface Seed { garment: string; gender: "men" | "women"; en: string; ar: string; }

// Build the seed list from the catalog taxonomy: every garment Debackers
// actually sells (men + women), plus a few opportunity probes.
function buildSeeds(): Seed[] {
  const seeds: Seed[] = [];
  const byType = new Map(GARMENTS.map((g) => [g.type, g]));
  const push = (type: string, gender: "men" | "women") => {
    const def = byType.get(type);
    if (!def) return;
    seeds.push({ garment: type, gender, en: def.en[0], ar: def.ar[0] || def.en[0] });
  };
  for (const g of GARMENTS) {
    if (g.catalog.men) push(g.type, "men");
    if (g.catalog.women) push(g.type, "women");
  }
  // Opportunity probes — demand we may not sell yet:
  push("jacket", "men"); push("jacket", "women");
  push("jumpsuit", "women"); push("shorts", "men");
  push("abaya", "women"); push("kaftan", "women");
  return seeds;
}

function seedQueries(s: Seed): string[] {
  return [
    `${s.en} ${GENDER_WORD[s.gender]} egypt`,
    `${s.ar} ${AR_GENDER[s.gender]} مصر`,
    `${s.ar} ${AR_GENDER[s.gender]}`,
  ];
}

export async function generateLiveTrends(): Promise<LiveTrendsResult> {
  const seasonMode = currentSeasonEgypt(); // "summer" in June
  const seeds = buildSeeds();

  // ── Fire everything in parallel ──────────────────────────────────────
  const [autocompleteRaw, dynamicSignals, influenceSources, demandSources, products, cachedDemand, cachedSearchConsole] =
    await Promise.all([
      // Real consumer search demand — autocomplete for every seed (men + women)
      Promise.all(
        seeds.flatMap((s) =>
          seedQueries(s).map(async (q) => {
            const { suggestions, source } = await fetchSuggestions(q);
            return suggestions.map((sug) => ({
              rawQuery: sug, source, gender: s.gender, seedGarment: s.garment,
            }));
          })
        )
      ).then((r) => r.flat()),
      // Live related-searches from Serper (men / women / general)
      getSerperDynamicSearchSignals(),
      // Layer 1 — influence sources (for the Sources panel + article support)
      collectSources([
        { q: "موضة مصر صيف 2026 ملابس رجالي نسائي ترندات القاهرة انستجرام تيك توك", days: 21, domains: null },
        { q: "بلوجرز موضة مصر ستايل صيف 2026 قميص كتان بنطلون فستان توب", days: 21, domains: null },
        { q: "site:instagram.com مصر موضة ملابس صيف 2026 رجالي نسائي القاهرة الساحل", days: 21, domains: null },
        { q: "site:tiktok.com مصر ترند ملابس صيف 2026 رجالي نسائي قميص فستان بنطلون", days: 21, domains: null },
        { q: "site:facebook.com مصر ملابس صيف 2026 كولكشن جديد رجالي نسائي", days: 21, domains: null },
        { q: "Egyptian fashion influencers Cairo summer outfits men women 2026", days: 21, domains: null },
      ]),
      // Layer 2 — search-demand articles (context + article support)
      collectSources([
        { q: "شراء ملابس رجالي مصر صيف 2026 قميص كتان بولو تشينو بدلة", days: 30, domains: null },
        { q: "شراء ملابس نسائي مصر صيف 2026 فستان توب بلوزة جيبة ست", days: 30, domains: null },
        { q: "ترندات لبس القاهرة صيف 2026 رجالي نسائي الساحل الشمالي", days: 21, domains: null },
        { q: "men Egypt fashion buy 2026 polo shirt chino jeans suit blazer", days: 30, domains: null },
        { q: "women Egypt fashion buy 2026 dress jeans skirt blouse co-ord set", days: 30, domains: null },
      ]),
      getShopifyProductImages(60),
      getCachedReport<SearchDemandResult>(CACHE_KEYS.searchDemand),
      getCachedReport<SearchConsoleResult>(CACHE_KEYS.searchConsole),
    ]);

  const influenceFiltered = refineSources(influenceSources);
  const demandFiltered = refineSources(demandSources);
  const allSources = [...influenceFiltered, ...demandFiltered];

  // Which garments do Layer 1/2 articles actually mention? (article support score)
  const articleGarments = new Set<string>();
  for (const s of allSources) {
    const hit = detectGarment(`${s.title} ${s.summary || ""}`);
    if (hit) articleGarments.add(hit.def.type);
  }

  // ── CLASSIFY everything (deterministic) ───────────────────────────────
  // ONLY real consumer signals count — autocomplete tails + live Serper
  // related-searches. Our own seed queries are the PROBE, never a signal.
  const classified: ClassifiedQuery[] = [];

  // 1) autocomplete tails (inherit gender + seed garment as fallback)
  for (const t of autocompleteRaw) {
    classified.push(classifySearchQuery(t.rawQuery, t.source, { gender: t.gender, seedGarment: t.seedGarment }));
  }
  // 2) Serper live related-searches
  for (const q of dynamicSignals.menSignals) classified.push(classifySearchQuery(q, "serper", { gender: "men" }));
  for (const q of dynamicSignals.womenSignals) classified.push(classifySearchQuery(q, "serper", { gender: "women" }));
  for (const q of dynamicSignals.generalSignals) classified.push(classifySearchQuery(q, "serper"));

  // ── Rejected log (deduped) ────────────────────────────────────────────
  const rejected: RejectedRow[] = [];
  const seenReject = new Set<string>();
  for (const c of classified) {
    if (!c.rejectReason || c.source === "seed") continue;
    const key = c.normalizedQuery;
    if (!key || seenReject.has(key)) continue;
    seenReject.add(key);
    rejected.push({ query: c.rawQuery, reason: c.rejectReason, source: c.source });
  }

  // ── CLUSTER + SCORE + SEASON GUARD ────────────────────────────────────
  const allClusters = buildDemandClusters(classified);
  const { active, backlog: backlogClusters } = applySeasonGuard(allClusters, seasonMode);

  const customerDemandQueries = mergeDemandSets(
    cachedCustomerDemandQueries(cachedDemand?.data),
    searchConsoleDemandSet(cachedSearchConsole?.data)
  );
  const ctx = { products: products as ShopProduct[], articleGarments, customerDemandQueries };
  for (const c of active) scoreCluster(c, ctx);

  // Qualifying clusters drive the demand map + trends (≥3 unique signals).
  const qualifying = active
    .filter((c) => c.uniqueSignals >= MIN_SIGNALS)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Under-evidenced clusters → rejected log (don't silently drop).
  for (const c of active) {
    if (c.uniqueSignals < MIN_SIGNALS && c.uniqueSignals > 0) {
      rejected.push({
        query: `${c.gender} ${c.garmentType} (${c.uniqueSignals} signal${c.uniqueSignals === 1 ? "" : "s"})`,
        reason: `fewer than ${MIN_SIGNALS} unique search signals — needs review`,
        source: "cluster",
      });
    }
  }

  // ── Search Demand Map rows ────────────────────────────────────────────
  const demandMap: DemandMapRow[] = qualifying.slice(0, DEMAND_MAP_CAP).map((c, i) => ({
    rank: i + 1,
    gender: c.gender,
    catalogCategory: c.catalogPath || (c.opportunity ? "— (opportunity, not in catalog)" : "—"),
    garmentType: c.garmentType,
    garmentLabel: label(c.garmentType),
    searchSignalCount: c.uniqueSignals,
    topFabrics: c.topFabric ? [c.topFabric] : [],
    topModifiers: c.topModifiers,
    topColors: c.topColors,
    topIntent: c.topIntent,
    inCatalog: !!c.inCatalog,
    opportunity: !!c.opportunity,
    score: c.score ?? 0,
    confidence: c.confidence ?? "weak",
    exampleQueries: c.exampleQueries.slice(0, 5),
    scoreBreakdown: c.scoreBreakdown ?? {},
  }));

  // ── Winter Backlog rows ───────────────────────────────────────────────
  const backlog: BacklogRow[] = backlogClusters.map(({ cluster, reason }) => ({
    garmentType: cluster.garmentType,
    garmentLabel: label(cluster.garmentType),
    gender: cluster.gender,
    reason,
    signalCount: cluster.uniqueSignals,
  }));

  // ── AI COPY for the top clusters (Groq EXPLAINS, never decides) ────────
  const topClusters = qualifying.slice(0, TOP_TRENDS);
  const aiCopy = await enrichClustersWithCopy(topClusters, seasonMode);

  const trends: RichTrend[] = topClusters.map((c) => buildTrendFromCluster(c, aiCopy[c.clusterKey], articleGarments));

  return { trends, sources: allSources, demandMap, rejected: rejected.slice(0, 60), backlog };
}

// Ask Groq to write business copy for already-classified clusters.
// Hard rule: it may NOT change garment type / gender / products.
async function enrichClustersWithCopy(
  clusters: DemandCluster[],
  seasonMode: string
): Promise<Record<string, any>> {
  if (!clusters.length) return {};

  const payload = clusters.map((c) => ({
    key: c.clusterKey,
    name: buildTrendName(c),
    gender: c.gender,
    garmentType: c.garmentType,
    fabric: c.topFabric,
    modifiers: c.topModifiers,
    colors: c.topColors,
    signalCount: c.uniqueSignals,
    inCatalog: c.inCatalog,
    examples: c.exampleQueries.slice(0, 4),
  }));

  const prompt = `You are a demand analyst + copywriter for DEBACKERS Egypt (premium men + women fashion). Season: ${seasonMode}, Cairo June 2026, 35–42°C.

Below are PRE-CLASSIFIED demand clusters. Our system already determined each cluster's garment type, gender, fabric and product matches from REAL Egyptian search data. These are FIXED.

YOUR ONLY JOB: write business copy for each cluster.

ABSOLUTE RULES — breaking any of these makes the output invalid:
- NEVER change the garmentType or gender.
- NEVER invent product names or merge clusters.
- NEVER turn a fabric into a garment (jeans stays jeans, not "denim jacket").
- If inCatalog is false, frame it as an OPPORTUNITY / sourcing play, not an in-stock push.
- Keep everything Egypt + ${seasonMode} relevant (no wool/winter items in summer).

CLUSTERS (JSON):
${JSON.stringify(payload, null, 1)}

Return ONLY a JSON object keyed by the EXACT cluster "key" string. For each key:
{
  "arabicName": "Egyptian Arabic name for this garment trend",
  "description": "1 sentence: gender + garment + fabric/colour + why it matters now",
  "recommendation": "one clear action for Debackers",
  "competitorReaction": { "tieHouse": "", "britishHouse": "", "massimoDutti": "", "gap": "the opening for Debackers" },
  "contentPrescription": { "hook": "Egyptian Arabic hook", "format": ["reel"], "hashtags": ["#tag"], "bestTime": "8-11pm" }
}
Return ONLY the JSON object. One entry per cluster key above.`;

  try {
    const text = await callClaude(buildSystemPrompt(), prompt, 3500);
    return parseJson<Record<string, any>>(text);
  } catch {
    return {};
  }
}

// Build a RichTrend from a scored cluster. Everything structural is
// deterministic; only the copy comes from the (optional) AI map.
function buildTrendFromCluster(
  c: DemandCluster,
  copy: any,
  articleGarments: Set<string>
): RichTrend {
  const inCatalog = !!c.inCatalog;
  const score = c.score ?? 0;
  const urgency: "act-now" | "prepare" | "monitor" =
    inCatalog && score >= 70 ? "act-now" : score >= 50 ? "prepare" : "monitor";
  const readiness: "ready" | "partial" | "needs-sourcing" =
    inCatalog ? "ready" : c.catalogPath ? "partial" : "needs-sourcing";
  const recommendedAction =
    inCatalog && score >= 70 ? "campaign push" :
    c.opportunity && score >= 60 ? "small stock test" :
    score >= 45 ? "content only" : "monitor";

  const signalLayer: "influence" | "search-demand" | "both" =
    articleGarments.has(c.garmentType) ? "both" : "search-demand";

  const genderSignals = unique(c.exampleQueries.concat(c.signals));
  const arabicEvidence = genderSignals.filter((s) => ARABIC_TEXT.test(s)).slice(0, 10);
  const englishEvidence = genderSignals.filter((s) => !ARABIC_TEXT.test(s)).slice(0, 10);
  const menList = c.gender === "men" ? c.signals.slice(0, 18) : [];
  const womenList = c.gender === "women" ? c.signals.slice(0, 18) : [];

  return {
    id: c.clusterKey.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    name: buildTrendName(c),
    arabicName: copy?.arabicName || "",
    platform: "google",
    category: "product",
    trendScore: score,
    growthRate: 0, // honest: autocomplete gives demand DIRECTION, not a growth %
    relevanceScore: c.scoreBreakdown?.catalogMatch ?? (inCatalog ? 100 : c.catalogPath ? 50 : 0),
    confidenceScore: c.confidence === "strong" ? 85 : c.confidence === "medium" ? 60 : 35,
    expectedPeakDays: 0,
    survivalRate: 0,
    signals: [
      { source: "search-demand", metric: "unique search signals", value: String(c.uniqueSignals), weight: score, direction: "up" },
      { source: "search-demand", metric: "buying-intent share", value: `${c.totalSignals ? Math.round((c.buyingSignals / c.totalSignals) * 100) : 0}%`, weight: c.scoreBreakdown?.buyingIntent ?? 0, direction: "up" },
      ...(c.scoreBreakdown?.customerDemand ? [
        { source: "cached-google-demand", metric: "customer demand match", value: `${c.scoreBreakdown.customerDemand}%`, weight: c.scoreBreakdown.customerDemand, direction: "up" as const },
      ] : []),
    ],
    competitorReaction: {
      tieHouse: copy?.competitorReaction?.tieHouse || "—",
      britishHouse: copy?.competitorReaction?.britishHouse || "—",
      massimoDutti: copy?.competitorReaction?.massimoDutti || "—",
      gap: copy?.competitorReaction?.gap || "—",
    },
    catalogMatch: {
      products: (c.matchedProducts || []).map((p) => p.title),
      readiness,
      urgency,
    },
    contentPrescription: {
      format: Array.isArray(copy?.contentPrescription?.format) ? copy.contentPrescription.format : ["reel"],
      hook: copy?.contentPrescription?.hook || "",
      hashtags: Array.isArray(copy?.contentPrescription?.hashtags) ? copy.contentPrescription.hashtags : [],
      bestTime: copy?.contentPrescription?.bestTime || "8–11pm",
    },
    description: copy?.description || `${c.gender} ${label(c.garmentType)}${c.topFabric ? " in " + c.topFabric : ""} — ${c.uniqueSignals} real Egyptian searches.`,
    gender: c.gender === "men" || c.gender === "women" ? c.gender : "unisex",
    evidenceStrength: c.confidence === "strong" ? "strong" : c.confidence === "medium" ? "medium" : "weak",
    signalsVerified: c.exampleQueries.slice(0, 6),
    signalsMissing: ["search VOLUME not available (autocomplete = demand direction, not counts)"],
    recommendedAction,
    signalLayer,
    matchedProducts: c.matchedProducts || [],
    searchSeed: c.garmentType,
    searchDemandMen: menList,
    searchDemandWomen: womenList,
    searchDemand: [...arabicEvidence, ...englishEvidence].slice(0, 10),
    arabicEvidence,
    englishEvidence,
    // deterministic cluster layer
    garmentType: c.garmentType,
    garmentFamily: c.garmentFamily,
    catalogCategory: c.catalogPath || "",
    topFabric: c.topFabric,
    topModifiers: c.topModifiers,
    searchSignalCount: c.uniqueSignals,
    clusterScore: score,
    scoreBreakdown: c.scoreBreakdown,
    inCatalog,
    opportunity: !!c.opportunity,
  };
}

// ─── LIVE COMPETITORS (Arabic-first, deterministic signals → AI copy) ──────
import { CompetitorIntelligence } from "./competitor-intelligence";
import {
  COMPETITOR_BRANDS, buildBrandQueries, classifySnippet, clusterBrandSignals, SnippetSignal,
} from "./competitor-arabic";

export interface LiveCompetitorReport {
  competitors: CompetitorIntelligence[];
  marketGaps: string[];
  sources: Source[];
}

export async function generateLiveCompetitors(): Promise<LiveCompetitorReport> {
  // 1) Per-brand: batched Arabic+English search → classify by code → cluster.
  //    Noise is isolated here (snippet must mention the brand AND carry a
  //    real offer/garment/angle signal; one-off signals are dropped later).
  const perBrand = await Promise.all(
    COMPETITOR_BRANDS.map(async (b) => {
      const snippets = await collectSources(buildBrandQueries(b));
      const signals = snippets
        .map((s) => classifySnippet({ title: s.title, summary: s.summary, url: s.url }, b))
        .filter((x): x is SnippetSignal => x !== null);
      return { brand: b, snippets, cluster: clusterBrandSignals(signals) };
    })
  );

  // 2) Compact CLUSTERED payload — the AI explains, it never invents the signal.
  const payload = perBrand.map(({ brand, cluster }) => ({
    brand: brand.name,
    segment: brand.segment,
    signalCount: cluster.totalSignals,
    strongOffers: cluster.strongOffers,
    topOffers: cluster.offerCounts.slice(0, 4),
    topGarments: cluster.garmentCounts.slice(0, 5),
    topAngles: cluster.angleCounts.slice(0, 4),
    genderSplit: cluster.genderSplit,
    arabicKeywords: cluster.arabicKeywords.slice(0, 12),
    evidenceAr: cluster.arabicEvidence.slice(0, 3).map((e) => e.text),
    evidenceEn: cluster.englishEvidence.slice(0, 3).map((e) => e.text),
  }));

  const prompt = `You are a competitive intelligence analyst for DEBACKERS Egypt (premium men + women fashion, Belgian heritage 1986). Cairo, summer June 2026.

Below are PRE-CLASSIFIED competitor signals our system detected from REAL Arabic + English search results. Offer types, garments, angles and keywords are FIXED facts — do NOT change them or invent new ones. If a brand's signalCount is 0 or very low, say signals are thin / keep monitoring — do NOT fabricate activity.

YOUR JOB: for each brand, interpret the signals into business meaning + Arabic-facing copy the Debackers team can use.

SIGNALS (JSON):
${JSON.stringify(payload, null, 1)}

Return ONLY this JSON object:
{
  "competitors": {
    "<exact brand name>": {
      "insights": ["3-5 specific observations grounded ONLY in the signals above"],
      "pricingStrategy": "their pricing approach vs Debackers",
      "contentThemes": ["theme1","theme2","theme3"],
      "gaps": ["2-3 openings Debackers can exploit"],
      "threatLevel": "high|medium|low",
      "arabicSummary": "جملة أو اتنين بالعامية المصرية بتلخص اللي البراند ده بيعمله دلوقتي",
      "arabicOfferInterpretation": "العروض دي معناها ايه للسوق المصري (بالعربي)",
      "arabicCounterAngle": "ازاي ديباكرز ترد على ده من غير ما تدخل حرب أسعار (بالعربي)",
      "arabicCampaignHook": "هوك إعلاني جاهز بالعامية المصرية لديباكرز"
    }
  },
  "marketGaps": ["overall opening 1","2","3","4"]
}
Cover EVERY brand in the signals (use the exact brand name as the key). Return ONLY the JSON.`;

  let aiMap: Record<string, any> = {};
  let marketGaps: string[] = [];
  try {
    const text = await callClaude(buildSystemPrompt(), prompt, 5000);
    const raw = parseJson<{ competitors: Record<string, any>; marketGaps: string[] }>(text);
    aiMap = raw.competitors || {};
    marketGaps = Array.isArray(raw.marketGaps) ? raw.marketGaps : [];
  } catch {
    /* keep deterministic data even if the AI copy step fails */
  }

  const competitors: CompetitorIntelligence[] = perBrand.map(({ brand, cluster }) => {
    const ai = aiMap[brand.name] || {};
    const defThreat: "medium" | "low" = brand.segment === "premium" ? "medium" : "low";
    return {
      name: brand.name,
      website: brand.website || "",
      metaAdsUrl: brand.metaAds,
      segment: brand.segment,
      insights: Array.isArray(ai.insights) ? ai.insights : [],
      campaigns: [],
      contentThemes: Array.isArray(ai.contentThemes) ? ai.contentThemes
        : cluster.angleCounts.slice(0, 4).map((a) => a.angle),
      pricingStrategy: ai.pricingStrategy || "",
      gaps: Array.isArray(ai.gaps) ? ai.gaps : [],
      threatLevel: ["high", "medium", "low"].includes(ai.threatLevel) ? ai.threatLevel : defThreat,
      lastUpdated: new Date().toISOString(),
      arabicSummary: ai.arabicSummary || "",
      arabicCounterAngle: ai.arabicCounterAngle || "",
      arabicCampaignHook: ai.arabicCampaignHook || "",
      arabicOfferInterpretation: ai.arabicOfferInterpretation || "",
      detectedKeywords: { ar: cluster.arabicKeywords, en: cluster.englishKeywords },
      offerSignals: cluster.offerCounts,
      garmentFocus: cluster.garmentCounts.slice(0, 6).map((g) => g.garment),
      topAngles: cluster.angleCounts.slice(0, 5).map((a) => a.angle),
      genderSplit: cluster.genderSplit,
      arabicEvidence: cluster.arabicEvidence,
      englishEvidence: cluster.englishEvidence,
      signalCount: cluster.totalSignals,
    };
  });

  // Dedupe sources across all brands for the Sources panel.
  const sources: Source[] = [];
  const seen = new Set<string>();
  for (const { snippets } of perBrand) {
    for (const s of snippets) {
      if (s.url && !seen.has(s.url)) { seen.add(s.url); sources.push(s); }
    }
  }

  return { competitors, marketGaps, sources };
}

// ─── LIVE TREND ALERTS ────────────────────────────────────────────────
import { TrendAlert } from "./trend-alerts";

export interface LiveAlertsResult {
  alerts: TrendAlert[];
  sources: Source[];
}

export async function generateLiveAlerts(): Promise<LiveAlertsResult> {
  const [sources, dynamicSignals] = await Promise.all([
    collectSources([
      { q: "ملابس رجالي صيف 2026 مصر قمصان بولو بناطيل كتان", days: 30 },
      { q: "ملابس نسائي صيف 2026 مصر فساتين بلوزات بناطيل ستات", days: 30 },
      { q: "موضة مصر كولكشن جديد رجالي نسائي صيف 2026", days: 30, topic: "news" },
      { q: "site:instagram.com مصر موضة ملابس صيف 2026 رجالي نسائي", days: 30 },
      { q: "site:tiktok.com مصر ترند ملابس صيف 2026 قميص فستان بنطلون", days: 30 },
      { q: "site:facebook.com مصر ملابس صيف 2026 كولكشن جديد رجالي نسائي", days: 30 },
      { q: "Egypt Sahel North Coast summer outfits men women 2026 ملابس صيف", days: 30 },
    ]),
    getSerperDynamicSearchSignals(),
  ]);
  const searchText = sources.length
    ? sources.map((s) => `- ${s.title}: ${s.summary}`).join("\n")
    : "No fresh signals found this week.";
  const googleDemandText = [
    ...dynamicSignals.menSignals.slice(0, 8).map((q) => `MEN Google demand: ${q}`),
    ...dynamicSignals.womenSignals.slice(0, 8).map((q) => `WOMEN Google demand: ${q}`),
    ...dynamicSignals.generalSignals.slice(0, 5).map((q) => `GENERAL Google demand: ${q}`),
  ].join("\n") || "No Google related-search demand signals found.";

  const prompt = `You are a trend-alert system for DEBACKERS Egypt (premium MEN + WOMEN fashion).
From the LIVE signals below, surface the 4 FASTEST-RISING / NEWEST things that need action now.

Current date: June 2026.
Freshness rule: use only signals from the last 30 days or Google demand signals collected today.
Priority rule: Google demand/search intent is the strongest signal because it shows what customers are searching now.
Language weight rule: Egyptian Arabic signals count 70%, English signals count 30%.
Reject anything not about clothing, fashion, outfits, fabrics, colours, silhouettes, men/women apparel, or DEBACKERS-relevant retail.

=== GOOGLE DEMAND SIGNALS COLLECTED TODAY ===
${googleDemandText}
=== END GOOGLE DEMAND ===

=== FRESH DATED SOURCES (last 30 days only) ===
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
  const fashionAlert = /\b(fashion|style|outfit|wear|clothing|dress|shirt|polo|tee|trouser|pants|jeans|chino|blazer|suit|jacket|skirt|blouse|top|co-ord|set|abaya|kaftan|linen|cotton|denim|viscose|silk|satin|chiffon|modest|menswear|womenswear|wide.?leg|summer|beachwear)\b/i;
  const rejectAlert = /\b(politics|war|refugee|deportation|travel alert|tourism|monorail|museum|ancient|pharaoh|archaeology|football|weather|transport)\b/i;
  const cleanAlerts = raw.filter((a) => {
    const text = `${a?.trendName || ""} ${a?.relevanceToDebackers || ""} ${(a?.signals || []).join(" ")}`;
    return fashionAlert.test(text) && !rejectAlert.test(text);
  });
  const alerts: TrendAlert[] = cleanAlerts.slice(0, 4).map((a, i) => ({
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
  colors: string[];
  mood: string;
  useFor: string;
}
export interface LiveInspirationResult {
  boards: InspirationItem[];
  sources: Source[];
}

export async function generateLiveInspiration(): Promise<LiveInspirationResult> {
  const sources = await collectSources([
    { q: "fashion colour palette spring summer 2026 Egypt trend forecast linen cotton", days: 60 },
    { q: "Egypt menswear womenswear key colours silhouettes summer 2026 Cairo Sahel", days: 60 },
    { q: "Egypt fashion aesthetic mood summer 2026 editorial North Coast", days: 45 },
  ]);
  const searchText = sources.length
    ? sources.map((s) => `- ${s.title}: ${s.summary}`).join("\n")
    : "Use Egyptian seasonal context + premium aesthetics.";

  const prompt = `You are a creative director for DEBACKERS Egypt (premium MEN + WOMEN fashion).
Propose 4 visual mood boards for the CURRENT season in Egypt, grounded in the live signals below.

Egypt is in SUMMER (June 2026, 35–42°C). Boards must reflect Egyptian summer: breathable fabrics (linen, cotton, bamboo, viscose), resort wear, North Coast/Sahel aesthetic, lightweight silhouettes.
NEVER suggest: wool, leather, tweed, fur, heavy coats, or any cold-weather garment.

=== LIVE SIGNALS ===
${searchText}
=== END ===

Rules:
- Include BOTH men's and women's boards (at least 1 each).
- Name specific garments + silhouettes in the description (e.g. "men's relaxed linen shirt", "women's bias-cut viscose midi").
- All garments must be wearable in 35–42°C heat — breathable fabrics only.
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
