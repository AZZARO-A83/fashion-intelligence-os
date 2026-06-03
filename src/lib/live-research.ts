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
} from "./tavily";
import { RichTrend } from "./trend-engine";

function parseJson<T>(text: string): T {
  // Strip code fences / stray prose, grab the outermost JSON.
  const cleaned = text.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}

// ─── LIVE TRENDS ──────────────────────────────────────────────────────
export async function generateLiveTrends(): Promise<RichTrend[]> {
  const [trends, influencers] = await Promise.all([
    searchEgyptianFashionTrends(),
    searchEgyptianInfluencers(),
  ]);

  const prompt = `You are a fashion trend analyst for DEBACKERS Egypt (premium men+women fashion).
Using the LIVE web search results below, identify the 5 most relevant CURRENT trends for Egyptian fashion right now.

=== LIVE SEARCH RESULTS ===
${trends}

${influencers}
=== END ===

Return ONLY a JSON array of 5 trends in EXACTLY this shape:
[{
  "id": "kebab-id",
  "name": "Trend name",
  "arabicName": "الاسم بالعربي",
  "platform": "tiktok|instagram|meta|google|multi",
  "category": "aesthetic|color|style|product|sound|occasion",
  "trendScore": 85,
  "growthRate": 30,
  "relevanceScore": 80,
  "confidenceScore": 75,
  "expectedPeakDays": 14,
  "survivalRate": 60,
  "signals": [{"source":"TikTok Egypt","metric":"hashtag views","value":"2.5M","weight":80,"direction":"up"}],
  "historicalMatch": "short note or empty",
  "lastYearOutcome": "short note or empty",
  "competitorReaction": {"tieHouse":"...","britishHouse":"...","massimoDutti":"...","gap":"what none are doing"},
  "catalogMatch": {"products":["..."],"readiness":"ready|partial|needs-sourcing","urgency":"act-now|prepare|monitor"},
  "contentPrescription": {"format":["reel","tiktok"],"hook":"Arabic hook","hashtags":["#tag"],"sounds":["..."],"bestTime":"8-11pm"},
  "description": "1-2 sentences"
}]
Base scores on the real search signals. Use Egyptian Arabic for hooks. Return ONLY the JSON array.`;

  const text = await callClaude(buildSystemPrompt(), prompt, 4500);
  const raw = parseJson<any[]>(text);
  return raw.map((t, i) => normalizeTrend(t, i));
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
  };
}

// ─── LIVE COMPETITORS ─────────────────────────────────────────────────
import { CompetitorIntelligence } from "./competitor-intelligence";

export interface LiveCompetitorReport {
  competitors: CompetitorIntelligence[];
  marketGaps: string[];
}

export async function generateLiveCompetitors(): Promise<LiveCompetitorReport> {
  const competitors = await searchCompetitorActivity();

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
  return { competitors: competitorsOut, marketGaps: raw.marketGaps ?? [] };
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
