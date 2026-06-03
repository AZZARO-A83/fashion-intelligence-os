// ─── Agency Research Engine ───────────────────────────────────────────
// Powers all Agency Intelligence reports: Flash Brief, Weekly, Monthly
// Data source: AI Research (Groq Llama 3.3 70B) + verified Egyptian context
// Labels: 🔵 AI RESEARCH = AI-analyzed market knowledge
//         🟢 LIVE = from real API (Shopify)
//         🔴 MOCK = placeholder, not yet connected

import { callClaude } from "./claude-api";
import { buildSystemPrompt, buildDynamicCalendar, EGYPTIAN_CONSUMER_PROFILE } from "./egyptian-context";
import {
  searchEgyptianFashionTrends,
  searchCompetitorActivity,
  searchEgyptianInfluencers,
  searchMarketIntelligence,
} from "./tavily";
import { FlashBrief, WeeklyBrief, MonthlyStrategy } from "@/types";

// ─── Context builder ──────────────────────────────────────────────────
function buildResearchContext(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-EG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  return `TODAY: ${dateStr}
BRAND: DEBACKERS EGYPT — Premium casual, semi-casual, formal — Men & Women
UNIQUE ADVANTAGE: Only Egyptian brand with full men + women wardrobe. Belgian heritage 1986. Local pricing advantage vs imports.`;
}

// ─── Flash Brief Generator (every 3 days) ────────────────────────────
export async function generateFlashBrief(preFetchedResearch?: any): Promise<FlashBrief> {
  const context = buildResearchContext();
  const now = new Date();

  // Use pre-fetched research from Step 1 if available, otherwise search now
  let trends: string, competitors: string, influencers: string, market: string;

  if (preFetchedResearch) {
    console.log("[Research] Using pre-fetched research data");
    trends = preFetchedResearch.trends ?? "No trend data";
    competitors = preFetchedResearch.competitors ?? "No competitor data";
    influencers = preFetchedResearch.influencers ?? "No influencer data";
    market = preFetchedResearch.market ?? "No market data";
  } else {
    console.log("[Research] Searching live web for flash brief...");
    [trends, competitors, influencers, market] = await Promise.all([
      searchEgyptianFashionTrends(),
      searchCompetitorActivity(),
      searchEgyptianInfluencers(),
      searchMarketIntelligence(),
    ]);
  }

  const liveResearch = `
=== LIVE WEB RESEARCH (searched right now) ===

${trends}

${competitors}

${influencers}

${market}

=== END LIVE RESEARCH ===
`;

  const prompt = `Generate a Flash Market Brief for DEBACKERS Egypt (next 3 days). For: Marketing Team + Content Creators.

${context}

${liveResearch}

Return ONLY valid JSON:
{
  "marketPulse": "2 sentences on Egyptian fashion right now",
  "trends": [{"name":"","platform":"tiktok|instagram|both","why":"","howToUse":"","urgency":"high|medium|low","hashtags":[]}],
  "hooks": ["Arabic hook","Mixed hook","English hook","Arabic hook 2","English hook 2"],
  "campaignIdeas": [{"name":"","objective":"","audience":"","hook_ar":"","hook_en":"","format":"Reel|TikTok|Carousel|Story","timing":"","confidence":85,"whyNow":""}],
  "competitorMoves": [{"competitor":"","observation":"","gap":"","action":""}],
  "urgentActions": ["action 1","action 2","action 3"],
  "forCreators": {
    "readyHooks": ["hook 1","hook 2","hook 3"],
    "captionFormulas": ["formula 1","formula 2"],
    "hashtagSets": [["#tag1","#tag2"],["#tag3","#tag4"]],
    "visualDirections": ["direction 1","direction 2"]
  }
}`;

  const text = await callClaude(buildSystemPrompt(), prompt, 3000);

  try {
    const data = JSON.parse(text);
    return {
      ...data,
      generatedAt: now.toISOString(),
      period: "Next 3 days",
      season: "Summer 2026 — North Coast Season",
      dataSource: "ai-research",
    } as FlashBrief;
  } catch {
    throw new Error("Failed to parse Flash Brief response");
  }
}

// ─── Weekly Brief Generator ───────────────────────────────────────────
export async function generateWeeklyBrief(preFetchedResearch?: any): Promise<WeeklyBrief> {
  const context = buildResearchContext();
  const now = new Date();

  let trends: string, competitors: string, influencers: string;

  if (preFetchedResearch) {
    trends = preFetchedResearch.trends ?? "No trend data";
    competitors = preFetchedResearch.competitors ?? "No competitor data";
    influencers = preFetchedResearch.influencers ?? "No influencer data";
  } else {
    [trends, competitors, influencers] = await Promise.all([
      searchEgyptianFashionTrends(),
      searchCompetitorActivity(),
      searchEgyptianInfluencers(),
    ]);
  }

  const liveResearch = `
=== LIVE WEB RESEARCH (searched right now) ===
${trends}
${competitors}
${influencers}
=== END LIVE RESEARCH ===
`;
  const weekOf = now.toLocaleDateString("en-EG", { month: "long", day: "numeric", year: "numeric" });

  const prompt = `Generate a Weekly Marketing Brief for DEBACKERS Egypt. Audience: Management + Marketing Team.

${context}

${liveResearch}

Return ONLY valid JSON:
{
  "executiveSummary": "2-3 sentence overview",
  "topOpportunities": ["opp1","opp2","opp3","opp4","opp5"],
  "campaigns": [{"name":"","objective":"","audience":"","hook_ar":"","hook_en":"","format":"","timing":"","confidence":80,"whyNow":""}],
  "competitorWatch": [{"competitor":"","observation":"","gap":"","action":""}],
  "contentPlan": [{"day":"Monday","platform":"Instagram","format":"Reel","topic":"","hook":""}],
  "kpiTargets": [{"metric":"","target":"","rationale":""}]
}`;

  const text = await callClaude(buildSystemPrompt(), prompt, 3500);

  try {
    const data = JSON.parse(text);
    return {
      ...data,
      generatedAt: now.toISOString(),
      weekOf,
    } as WeeklyBrief;
  } catch {
    throw new Error("Failed to parse Weekly Brief response");
  }
}

// ─── Monthly Strategy Generator ──────────────────────────────────────
export async function generateMonthlyStrategy(preFetchedResearch?: any): Promise<MonthlyStrategy> {
  const context = buildResearchContext();
  const now = new Date();

  let trends: string, competitors: string, influencers: string, market: string;

  if (preFetchedResearch) {
    trends = preFetchedResearch.trends ?? "No trend data";
    competitors = preFetchedResearch.competitors ?? "No competitor data";
    influencers = preFetchedResearch.influencers ?? "No influencer data";
    market = preFetchedResearch.market ?? "No market data";
  } else {
    [trends, competitors, influencers, market] = await Promise.all([
      searchEgyptianFashionTrends(),
      searchCompetitorActivity(),
      searchEgyptianInfluencers(),
      searchMarketIntelligence(),
    ]);
  }

  const liveResearch = `
=== LIVE WEB RESEARCH (searched right now) ===
${trends}
${competitors}
${influencers}
${market}
=== END LIVE RESEARCH ===
`;
  const month = now.toLocaleDateString("en-EG", { month: "long", year: "numeric" });

  const prompt = `Generate a Monthly Marketing Strategy for DEBACKERS Egypt. Audience: Management.

${context}

${liveResearch}

Return ONLY valid JSON:
{
  "executiveSummary": "3-4 sentence strategic overview",
  "marketAnalysis": "Market analysis paragraph",
  "seasonalStrategy": "How to capitalize on current season",
  "campaignCalendar": [{"week":"Week 1","focus":"","campaigns":["",""],"platforms":["instagram","tiktok"]}],
  "budgetRecommendation": "Budget allocation guidance",
  "competitorStrategy": "How to outmaneuver competitors",
  "kpiForecast": [{"metric":"","forecast":"","basis":""}],
  "metaAdsNote": "Meta Ads integration coming soon — real campaign performance, ROAS, and audience data will appear here once connected."
}`;

  const text = await callClaude(buildSystemPrompt(), prompt, 3500);

  try {
    const data = JSON.parse(text);
    return {
      ...data,
      generatedAt: now.toISOString(),
      month,
    } as MonthlyStrategy;
  } catch {
    throw new Error("Failed to parse Monthly Strategy response");
  }
}
