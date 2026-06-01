// ─── Agency Research Engine ───────────────────────────────────────────
// Powers all Agency Intelligence reports: Flash Brief, Weekly, Monthly
// Data source: AI Research (Groq Llama 3.3 70B) + verified Egyptian context
// Labels: 🔵 AI RESEARCH = AI-analyzed market knowledge
//         🟢 LIVE = from real API (Shopify)
//         🔴 MOCK = placeholder, not yet connected

import { callGemini } from "./gemini";
import { EGYPTIAN_FASHION_SYSTEM_PROMPT, SEASONAL_CALENDAR_2026, EGYPTIAN_CONSUMER_PROFILE } from "./egyptian-context";
import { FlashBrief, WeeklyBrief, MonthlyStrategy } from "@/types";

// ─── Context builder ──────────────────────────────────────────────────
function buildResearchContext(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-EG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  return `
TODAY: ${dateStr}
CURRENT SEASON: Summer 2026 — North Coast season JUST OPENED (June 1)
BRAND: DEBACKERS EGYPT — Premium casual, semi-casual, formal — Men & Women
POSITIONING: Only Egyptian brand with full men + women premium wardrobe

VERIFIED MARKET CONTEXT:
${EGYPTIAN_CONSUMER_PROFILE}
${SEASONAL_CALENDAR_2026}

COMPETITORS RIGHT NOW:
- Tie House: 96 branches, men only, heavy discounting, celebrity endorsements — THEY OWN VOLUME
- British House: Premium linen shirts men only, EGP 2,345–3,545, very niche — THEY OWN PREMIUM NICHE
- Massimo Dutti: International luxury, mall-only, no Arabic content — THEY OWN ASPIRATIONAL
→ THE GAP: No competitor owns premium women's fashion + smart casual for both genders + Egyptian cultural connection

DEBACKERS CURRENT STRENGTHS:
- 13 branches, 7 governorates (widest reach of premium local brands)
- Belgian heritage since 1986 (40 years quality story)
- Both men AND women (unique positioning)
- Price accessible vs imports (40% EGP devaluation helps local brands)
`;
}

// ─── Flash Brief Generator (every 3 days) ────────────────────────────
export async function generateFlashBrief(): Promise<FlashBrief> {
  const context = buildResearchContext();
  const now = new Date();

  const prompt = `
You are a senior marketing research analyst. Generate a Flash Market Brief for DEBACKERS Egypt.
This brief is used by: Marketing Team + Content Creators.
It covers the next 3 days of marketing activity.

${context}

Research and generate a FLASH BRIEF with:
1. MARKET PULSE — 2-sentence summary of what's happening in Egyptian fashion RIGHT NOW
2. TOP 3 TRENDS — What's trending on TikTok + Instagram Egypt right now (summer 2026)
3. TOP 5 HOOKS — Best performing hook structures for Egyptian fashion content this period
4. 3 CAMPAIGN IDEAS — Specific, actionable, tied to current trends
5. COMPETITOR MOVES — What competitors are likely doing and the gap Debackers can take
6. URGENT ACTIONS — Top 3 things to do in the next 3 days
7. FOR CREATORS — Ready-to-use content (hooks, captions, hashtags, visual directions)

Base everything on:
- Current season: Start of Egyptian summer / North Coast opening
- Market reality: Post-Eid Al-Adha (May 27) energy, people spending again
- Platform behavior: TikTok + Instagram Egypt patterns for June
- Debackers brand positioning: premium, both genders, Egyptian identity

Return ONLY valid JSON in this exact structure:
{
  "marketPulse": "2 sentences on what's happening now",
  "trends": [
    {
      "name": "Trend name",
      "platform": "tiktok|instagram|both",
      "why": "Why this trend matters for Debackers right now",
      "howToUse": "Specific way Debackers can use this trend",
      "urgency": "high|medium|low",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
    }
  ],
  "hooks": [
    "Hook 1 in Egyptian Arabic",
    "Hook 2 mixed Arabic/English",
    "Hook 3 in English",
    "Hook 4 Arabic",
    "Hook 5 English"
  ],
  "campaignIdeas": [
    {
      "name": "Campaign name",
      "objective": "What it achieves",
      "audience": "Specific segment",
      "hook_ar": "Arabic hook",
      "hook_en": "English hook",
      "format": "Reel|TikTok|Carousel|Story",
      "timing": "When to run",
      "confidence": 85,
      "whyNow": "Data/trend justification"
    }
  ],
  "competitorMoves": [
    {
      "competitor": "Competitor name",
      "observation": "What they're likely doing",
      "gap": "What they're missing",
      "action": "How Debackers takes this opportunity"
    }
  ],
  "urgentActions": [
    "Action 1",
    "Action 2",
    "Action 3"
  ],
  "forCreators": {
    "readyHooks": ["Hook ready to film 1", "Hook ready to film 2", "Hook ready to film 3"],
    "captionFormulas": ["Caption formula 1", "Caption formula 2"],
    "hashtagSets": [["#set1tag1", "#set1tag2", "#set1tag3"], ["#set2tag1", "#set2tag2"]],
    "visualDirections": ["Visual direction 1", "Visual direction 2"]
  }
}`;

  const text = await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 4000);

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
export async function generateWeeklyBrief(): Promise<WeeklyBrief> {
  const context = buildResearchContext();
  const now = new Date();
  const weekOf = now.toLocaleDateString("en-EG", { month: "long", day: "numeric", year: "numeric" });

  const prompt = `
You are a senior marketing strategist. Generate a WEEKLY MARKETING BRIEF for DEBACKERS Egypt.
Audience: Management + Marketing Team.
Covers: Full week strategy, competitor watch, content calendar, KPI targets.

${context}

Generate a comprehensive weekly brief covering:
1. EXECUTIVE SUMMARY — What's the big picture this week (2-3 sentences)
2. TOP 5 OPPORTUNITIES — Ranked by potential impact
3. WEEKLY CAMPAIGN IDEAS — 3-4 campaigns to run this week
4. COMPETITOR WATCH — What to watch from each competitor
5. CONTENT PLAN — Day-by-day content schedule (Mon–Sun)
6. KPI TARGETS — Specific targets for the week with rationale

Return ONLY valid JSON:
{
  "executiveSummary": "2-3 sentence overview",
  "topOpportunities": ["Opportunity 1", "Opportunity 2", "Opportunity 3", "Opportunity 4", "Opportunity 5"],
  "campaigns": [
    {
      "name": "Campaign name",
      "objective": "Objective",
      "audience": "Target audience",
      "hook_ar": "Arabic hook",
      "hook_en": "English hook",
      "format": "Content format",
      "timing": "Best time to run",
      "confidence": 80,
      "whyNow": "Justification"
    }
  ],
  "competitorWatch": [
    {
      "competitor": "Name",
      "observation": "What to watch",
      "gap": "Their weakness",
      "action": "Debackers counter-move"
    }
  ],
  "contentPlan": [
    {
      "day": "Monday",
      "platform": "Instagram",
      "format": "Reel",
      "topic": "Content topic",
      "hook": "Opening hook"
    }
  ],
  "kpiTargets": [
    {
      "metric": "Instagram Reach",
      "target": "50,000+",
      "rationale": "Why this target"
    }
  ]
}`;

  const text = await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 5000);

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
export async function generateMonthlyStrategy(): Promise<MonthlyStrategy> {
  const context = buildResearchContext();
  const now = new Date();
  const month = now.toLocaleDateString("en-EG", { month: "long", year: "numeric" });

  const prompt = `
You are a chief marketing strategist. Generate a MONTHLY MARKETING STRATEGY for DEBACKERS Egypt.
Audience: Management — strategic decisions, budget, direction.
Covers: Full month strategy, market analysis, campaign calendar, budget guidance, KPI forecast.

${context}

Generate a full monthly strategy:
1. EXECUTIVE SUMMARY — State of the market + big opportunity this month
2. MARKET ANALYSIS — Egyptian fashion market dynamics for this month
3. SEASONAL STRATEGY — How to capitalize on current season (Summer 2026)
4. CAMPAIGN CALENDAR — Week-by-week campaign plan
5. BUDGET RECOMMENDATION — Where to put marketing budget this month
6. COMPETITOR STRATEGY — How to outmaneuver each competitor
7. KPI FORECAST — Realistic targets for the month
8. META ADS NOTE — Placeholder section for when Meta Ads are connected (note: not yet integrated)

Return ONLY valid JSON:
{
  "executiveSummary": "3-4 sentence strategic overview",
  "marketAnalysis": "Detailed market analysis paragraph",
  "seasonalStrategy": "How to capitalize on current season",
  "campaignCalendar": [
    {
      "week": "Week 1 (June 1-7)",
      "focus": "Strategic focus",
      "campaigns": ["Campaign 1", "Campaign 2"],
      "platforms": ["instagram", "tiktok"]
    }
  ],
  "budgetRecommendation": "Detailed budget allocation guidance",
  "competitorStrategy": "How to outmaneuver competitors this month",
  "kpiForecast": [
    {
      "metric": "Metric name",
      "forecast": "Target value",
      "basis": "Why this is achievable"
    }
  ],
  "metaAdsNote": "Meta Ads integration coming soon — this section will auto-populate with real campaign performance, spend efficiency, ROAS, and audience data once connected."
}`;

  const text = await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 6000);

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
