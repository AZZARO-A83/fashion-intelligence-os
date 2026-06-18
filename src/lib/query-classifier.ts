// ─── Deterministic Search-Query Classifier + Cluster Builder ─────────────
// This is the brain of the rebuilt Trend Engine. It runs BEFORE any AI:
//
//   raw search query  →  classifySearchQuery()  →  structured object
//   many objects      →  buildDemandClusters()  →  gender+garment clusters
//   clusters          →  scoreCluster()         →  ranked demand
//   clusters          →  applySeasonGuard()     →  active vs Winter Backlog
//
// The AI only EXPLAINS the strongest clusters afterwards. It can never change
// the garment type, merge jeans into a jacket, or invent a trend from a fabric.

import {
  Gender, Intent, Season,
  GARMENTS, GarmentDef, GARMENT_PRODUCT_KEYWORDS, COLD_FABRICS,
  normalize, detectGender, detectGarment, detectFabric, detectModifiers,
  detectColors, detectSeason, detectIntent, isBuyingIntent, isNavLabel,
  catalogPathFor,
} from "./catalog-taxonomy";

export interface ShopProduct {
  title: string;
  image: string;
  price: string;
  type: string;
  url: string;
}

export interface ClassifiedQuery {
  rawQuery: string;
  normalizedQuery: string;
  gender: Gender;
  catalogPath: string | null;
  garmentType: string | null;
  garmentFamily: string | null;
  fabric: string | null;
  modifiers: string[];
  colors: string[];
  season: Season;
  intent: Intent;
  source: string;            // google | bing | duckduckgo | serper | autocomplete
  confidence: number;        // 0–1
  rejectReason: string | null;
}

export interface ClassifyHints {
  gender?: Gender;
  seedGarment?: string;      // the garment we searched for (tails inherit it)
}

const GARMENT_BY_TYPE = new Map(GARMENTS.map((g) => [g.type, g]));

// ─── 1. CLASSIFY ONE QUERY ────────────────────────────────────────────────
export function classifySearchQuery(
  rawQuery: string,
  source: string,
  hints: ClassifyHints = {}
): ClassifiedQuery {
  const normalizedQuery = normalize(rawQuery);
  const base: ClassifiedQuery = {
    rawQuery, normalizedQuery,
    gender: "unknown", catalogPath: null, garmentType: null, garmentFamily: null,
    fabric: null, modifiers: [], colors: [], season: "unknown",
    intent: "noise", source, confidence: 0, rejectReason: null,
  };

  if (!normalizedQuery || normalizedQuery.length < 3) {
    return { ...base, rejectReason: "empty or too short" };
  }
  if (isNavLabel(rawQuery)) {
    return { ...base, rejectReason: "navigation label (not a garment)" };
  }

  const gender = detectGender(rawQuery, hints.gender);

  // Garment from TEXT first; fall back to the seed garment we searched for.
  const hit = detectGarment(rawQuery);
  let def: GarmentDef | null = hit?.def ?? null;
  let garmentFromText = !!hit;
  if (!def && hints.seedGarment) {
    def = GARMENT_BY_TYPE.get(hints.seedGarment) ?? null;
    garmentFromText = false;
  }
  if (!def) {
    return { ...base, gender, rejectReason: "no garment type detected" };
  }

  const fabricHit = detectFabric(rawQuery);
  const fabric = fabricHit?.fabric ?? def.defaultFabric ?? null;
  const fabricCold = fabricHit?.cold ?? false;

  const modifiers = detectModifiers(rawQuery);
  const colors = detectColors(rawQuery);
  const season = detectSeason(rawQuery, def, fabricCold);
  const intent = detectIntent(rawQuery);
  const catalogPath = catalogPathFor(def, gender);

  // Confidence: how sure are we this is real, structured demand?
  let confidence = 0.2;
  if (garmentFromText) confidence += 0.4; else confidence += 0.1; // garment from hint = weaker
  if (gender !== "unknown") confidence += 0.2;
  if (fabricHit) confidence += 0.1;
  if (modifiers.length || colors.length) confidence += 0.1;
  confidence = Math.min(1, Math.round(confidence * 100) / 100);

  return {
    rawQuery, normalizedQuery, gender,
    catalogPath, garmentType: def.type, garmentFamily: def.family,
    fabric, modifiers, colors, season, intent, source, confidence,
    rejectReason: null,
  };
}

// ─── 2. CLUSTER BUILDER ───────────────────────────────────────────────────
export interface DemandCluster {
  clusterKey: string;            // `${gender}:${garmentType}`
  gender: Gender;
  garmentType: string;
  garmentFamily: string;
  catalogPath: string | null;

  signals: string[];             // unique normalized queries
  exampleQueries: string[];      // a few raw examples
  fabrics: Record<string, number>;
  modifiers: Record<string, number>;
  colors: Record<string, number>;
  intents: Record<string, number>;
  sources: string[];

  topFabric: string | null;
  topModifiers: string[];
  topColors: string[];
  topIntent: Intent;

  uniqueSignals: number;
  totalSignals: number;
  buyingSignals: number;
  infoSignals: number;

  season: Season;
  seasonCold: boolean;

  // Filled by scoreCluster():
  score?: number;
  scoreBreakdown?: Record<string, number>;
  confidence?: "strong" | "medium" | "weak";
  inCatalog?: boolean;
  opportunity?: boolean;
  matchedProducts?: { title: string; image: string; url: string; price: string }[];
}

function topKeys(freq: Record<string, number>, n: number): string[] {
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

export function buildDemandClusters(classified: ClassifiedQuery[]): DemandCluster[] {
  const map = new Map<string, DemandCluster>();
  const seenPerCluster = new Map<string, Set<string>>();

  for (const q of classified) {
    if (q.rejectReason || !q.garmentType) continue;
    const key = `${q.gender}:${q.garmentType}`;
    let c = map.get(key);
    if (!c) {
      const def = GARMENT_BY_TYPE.get(q.garmentType);
      c = {
        clusterKey: key, gender: q.gender, garmentType: q.garmentType,
        garmentFamily: q.garmentFamily || def?.family || "",
        catalogPath: q.catalogPath,
        signals: [], exampleQueries: [],
        fabrics: {}, modifiers: {}, colors: {}, intents: {}, sources: [],
        topFabric: null, topModifiers: [], topColors: [], topIntent: "buying",
        uniqueSignals: 0, totalSignals: 0, buyingSignals: 0, infoSignals: 0,
        season: "all-season", seasonCold: !!def?.seasonCold,
      };
      map.set(key, c);
      seenPerCluster.set(key, new Set());
    }
    const seen = seenPerCluster.get(key)!;

    c.totalSignals += 1;
    if (!seen.has(q.normalizedQuery)) {
      seen.add(q.normalizedQuery);
      c.signals.push(q.normalizedQuery);
      if (c.exampleQueries.length < 6) c.exampleQueries.push(q.rawQuery);
    }
    if (q.fabric) c.fabrics[q.fabric] = (c.fabrics[q.fabric] || 0) + 1;
    for (const m of q.modifiers) c.modifiers[m] = (c.modifiers[m] || 0) + 1;
    for (const col of q.colors) c.colors[col] = (c.colors[col] || 0) + 1;
    c.intents[q.intent] = (c.intents[q.intent] || 0) + 1;
    if (!c.sources.includes(q.source)) c.sources.push(q.source);
    if (isBuyingIntent(q.intent)) c.buyingSignals += 1;
    if (q.intent === "informational") c.infoSignals += 1;
    if (q.season === "winter") c.season = "winter";
    else if (q.season === "summer" && c.season !== "winter") c.season = "summer";
  }

  for (const c of map.values()) {
    c.uniqueSignals = c.signals.length;
    c.topFabric = topKeys(c.fabrics, 1)[0] ?? null;
    c.topModifiers = topKeys(c.modifiers, 3);
    c.topColors = topKeys(c.colors, 3);
    c.topIntent = (topKeys(c.intents, 1)[0] as Intent) ?? "buying";
    if (c.topFabric && COLD_FABRICS.has(c.topFabric)) c.seasonCold = true;
    if (c.season === "winter") c.seasonCold = true;
  }

  return [...map.values()];
}

// ─── 3. PRODUCT MATCH VALIDATOR ───────────────────────────────────────────
// Deterministic. AI never picks products. A product matches only if its title
// or type contains the cluster's garment keyword AND gender doesn't conflict.
const OPP_GENDER: Record<string, RegExp> = {
  men: /\b(women|woman|womens|ladies|lady|female|girls?)\b|نسائي|حريمي/i,
  women: /\b(men|mens|male|gentlemen|boys?)\b|رجالي/i,
};

export function validateProductMatches(
  cluster: { garmentType: string; gender: Gender },
  products: ShopProduct[]
): { title: string; image: string; url: string; price: string }[] {
  const kws = GARMENT_PRODUCT_KEYWORDS[cluster.garmentType] ?? [cluster.garmentType];
  const opp = cluster.gender === "men" || cluster.gender === "women" ? OPP_GENDER[cluster.gender] : null;

  const out: { title: string; image: string; url: string; price: string }[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    const hay = `${p.title} ${p.type}`.toLowerCase();
    if (!kws.some((k) => hay.includes(k))) continue;
    if (opp && opp.test(p.title)) continue;        // explicit opposite gender → skip
    const key = p.title.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title: p.title, image: p.image, url: p.url, price: p.price });
    if (out.length >= 6) break;
  }
  return out;
}

// ─── 4. SCORING ───────────────────────────────────────────────────────────
export interface ScoreContext {
  products: ShopProduct[];
  articleGarments: Set<string>;   // garment types confirmed by Layer 1/2 articles
  customerDemandQueries?: Set<string>; // cached Google/Search Demand terms, no fresh calls
}

export function scoreCluster(cluster: DemandCluster, ctx: ScoreContext): DemandCluster {
  const recurrenceScore = Math.min(100, (cluster.uniqueSignals / 8) * 100);
  const multiSourceScore = Math.min(100, (cluster.sources.length / 3) * 100);
  const buyingIntentScore = cluster.totalSignals
    ? (cluster.buyingSignals / cluster.totalSignals) * 100 : 0;

  const matched = validateProductMatches(cluster, ctx.products);
  cluster.matchedProducts = matched;
  cluster.inCatalog = matched.length > 0;
  cluster.opportunity = !cluster.inCatalog;
  const catalogMatchScore = cluster.inCatalog ? 100 : (cluster.catalogPath ? 50 : 0);

  const articleSupportScore = ctx.articleGarments.has(cluster.garmentType) ? 100 : 0;
  const customerDemandScore = scoreCustomerDemandMatch(cluster, ctx.customerDemandQueries);

  const score = ctx.customerDemandQueries?.size
    ? Math.round(
        recurrenceScore * 0.35 +
        multiSourceScore * 0.15 +
        buyingIntentScore * 0.10 +
        catalogMatchScore * 0.15 +
        articleSupportScore * 0.05 +
        customerDemandScore * 0.20
      )
    : Math.round(
        recurrenceScore * 0.45 +
        multiSourceScore * 0.20 +
        buyingIntentScore * 0.15 +
        catalogMatchScore * 0.15 +
        articleSupportScore * 0.05
      );

  cluster.score = score;
  cluster.scoreBreakdown = {
    recurrence: Math.round(recurrenceScore),
    multiSource: Math.round(multiSourceScore),
    buyingIntent: Math.round(buyingIntentScore),
    catalogMatch: catalogMatchScore,
    articleSupport: articleSupportScore,
    customerDemand: customerDemandScore,
  };
  cluster.confidence =
    score >= 70 && cluster.uniqueSignals >= 5 ? "strong" :
    score >= 45 ? "medium" : "weak";
  return cluster;
}

function scoreCustomerDemandMatch(
  cluster: DemandCluster,
  customerDemandQueries?: Set<string>
): number {
  if (!customerDemandQueries?.size) return 0;

  const tokens = [
    cluster.garmentType,
    cluster.garmentFamily,
    cluster.topFabric,
    ...cluster.topModifiers,
    ...cluster.topColors,
  ]
    .filter((v): v is string => !!v && v.length > 2)
    .map(normalize);

  let weightedMatches = 0;
  for (const query of customerDemandQueries) {
    const q = normalize(query);
    if (!q) continue;
    if (tokens.some((token) => q.includes(token) || token.includes(q))) {
      weightedMatches += /[؀-ۿ]/.test(q) ? 70 : 30;
    }
  }

  return Math.min(100, Math.round(weightedMatches / 2));
}

// ─── 5. SEASON GUARD ──────────────────────────────────────────────────────
export interface BacklogEntry { cluster: DemandCluster; reason: string; }

export function applySeasonGuard(
  clusters: DemandCluster[],
  seasonMode: "summer" | "winter"
): { active: DemandCluster[]; backlog: BacklogEntry[] } {
  if (seasonMode !== "summer") return { active: clusters, backlog: [] };
  const active: DemandCluster[] = [];
  const backlog: BacklogEntry[] = [];
  for (const c of clusters) {
    if (c.seasonCold) {
      backlog.push({
        cluster: c,
        reason: `Winter item (${c.garmentType}${c.topFabric ? " / " + c.topFabric : ""}) — hidden while seasonMode = summer`,
      });
    } else {
      active.push(c);
    }
  }
  return { active, backlog };
}

// ─── 6. TREND NAME (garment-first, never fabric-first) ────────────────────
const GARMENT_LABELS: Record<string, string> = {
  jeans: "Jeans", chino: "Chinos", pants: "Pants", shirt: "Shirts", overshirt: "Over-Shirt",
  polo: "Polo Shirts", tshirt: "T-Shirts", blazer: "Blazers", suit: "Suits", jacket: "Jackets",
  cardigan: "Cardigans", vest: "Vests", dress: "Dresses", skirt: "Skirts", blouse: "Blouses", top: "Tops",
  set: "Co-ord Sets", jumpsuit: "Jumpsuits", abaya: "Abayas", kaftan: "Kaftans", shorts: "Shorts",
  shoes: "Shoes", tie: "Ties", belt: "Belts", cufflink: "Cufflinks & Brooches", socks: "Socks",
  sweater: "Sweaters", hoodie: "Hoodies", coat: "Coats",
};

const title = (s: string) => s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export function buildTrendName(cluster: DemandCluster): string {
  const def = GARMENT_BY_TYPE.get(cluster.garmentType);
  const label = GARMENT_LABELS[cluster.garmentType] || title(cluster.garmentType);
  const details: string[] = [];

  if (cluster.topModifiers.length) details.push(...cluster.topModifiers.slice(0, 2).map(title));
  const defaultFabric = def?.defaultFabric;
  if (cluster.topFabric && cluster.topFabric !== defaultFabric) details.push(title(cluster.topFabric));
  else if (!details.length && cluster.topFabric) details.push(title(cluster.topFabric));
  if (cluster.topColors.length) details.push(title(cluster.topColors[0]));

  const detail = Array.from(new Set(details)).slice(0, 3).join(", ");
  return detail ? `${label} — ${detail}` : `${label} Demand`;
}
