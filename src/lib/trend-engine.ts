// ─── Trend types ──────────────────────────────────────────────────────
// The hardcoded trend list + scoring helpers were removed — the Trend Engine
// is now fully live (Tavily web search → Groq) via src/lib/live-research.ts.
// Only the shared shapes live here.

export interface TrendSignal {
  source: string;       // Where this signal came from
  metric: string;       // What was measured
  value: string;        // The measured value
  weight: number;       // How much it contributes to score (0-100)
  direction: "up" | "down" | "stable";
}

export interface RichTrend {
  id: string;
  name: string;
  arabicName?: string;
  platform: "tiktok" | "instagram" | "meta" | "google" | "multi";
  category: "aesthetic" | "color" | "style" | "product" | "sound" | "occasion";

  // Scores
  trendScore: number;        // Overall 0–100
  growthRate: number;        // % weekly growth
  relevanceScore: number;    // 0–100 relevance to Debackers catalog
  confidenceScore: number;   // 0–100 confidence this is real signal not noise
  expectedPeakDays: number;  // Days until peak
  survivalRate: number;      // % chance trend survives 30+ days

  signals: TrendSignal[];

  historicalMatch?: string;
  lastYearOutcome?: string;

  competitorReaction: {
    tieHouse: string;
    britishHouse: string;
    massimoDutti: string;
    gap: string;
  };

  catalogMatch: {
    products: string[];
    readiness: "ready" | "partial" | "needs-sourcing";
    urgency: "act-now" | "prepare" | "monitor";
  };

  contentPrescription: {
    format: string[];
    hook: string;
    hashtags: string[];
    sounds?: string[];
    bestTime: string;
  };

  description: string;

  // The real source this trend was drawn from (so the user can validate it).
  evidenceTitle?: string;
  evidenceUrl?: string;
  // Real Debackers products (from Shopify) that fit this trend.
  matchedProducts?: { title: string; image: string; url: string; price: string }[];

  // Egypt Trend Radar — honest evidence scoring.
  gender?: "men" | "women" | "unisex";
  evidenceStrength?: "strong" | "medium" | "weak";
  signalsVerified?: string[];     // signals we COULD verify (creator mention, repeated, local brand)
  signalsMissing?: string[];      // signals we could NOT (comments, Google Trends volume)
  recommendedAction?: string;     // content-only / small stock test / campaign push / avoid

  // Which signal layer drove this trend.
  signalLayer?: "influence" | "search-demand" | "both";

  // 🔍 SEARCHED ABOUT — real demand (what people type into Google), free.
  searchSeed?: string;            // the keyword we checked demand for
  searchDemand?: string[];        // real autocomplete suggestions (demand direction)
  searchDemandMen?: string[];     // top searches men type about this garment
  searchDemandWomen?: string[];   // top searches women type about this garment
  arabicEvidence?: string[];       // Arabic/Egyptian Arabic demand signals shown first in UI
  englishEvidence?: string[];      // English demand signals kept for comparison

  // ─── Deterministic cluster layer (classified BEFORE the AI) ──────────
  // These come from the garment classifier, never from the model.
  garmentType?: string;           // canonical garment (jeans, polo, dress…)
  garmentFamily?: string;         // family (Pants, Shirts…)
  catalogCategory?: string;       // Shopify catalog path
  topFabric?: string | null;      // dominant fabric (sub-layer, never the trend itself)
  topModifiers?: string[];        // baggy / black / wide-leg…
  searchSignalCount?: number;     // unique real search signals behind this cluster
  clusterScore?: number;          // deterministic 0–100 demand score
  scoreBreakdown?: Record<string, number>;
  inCatalog?: boolean;            // Debackers already sells this garment
  opportunity?: boolean;          // demand exists but not in catalog yet
}

// ─── Search Demand Map (the deterministic table shown before AI trends) ───
export interface DemandMapRow {
  rank: number;
  gender: string;
  catalogCategory: string;
  garmentType: string;
  garmentLabel: string;
  searchSignalCount: number;
  topFabrics: string[];
  topModifiers: string[];
  topColors: string[];
  topIntent: string;
  inCatalog: boolean;
  opportunity: boolean;
  score: number;
  confidence: "strong" | "medium" | "weak";
  exampleQueries: string[];
  scoreBreakdown: Record<string, number>;
}

// ─── Rejected query / Winter Backlog logging ──────────────────────────────
export interface RejectedRow {
  query: string;
  reason: string;
  source?: string;
}

export interface BacklogRow {
  garmentType: string;
  garmentLabel: string;
  gender: string;
  reason: string;
  signalCount: number;
}
