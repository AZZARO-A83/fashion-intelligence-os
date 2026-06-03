import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { getSalesData, buildSalesSummary } from "@/lib/shopify";
import { getInstagramAnalytics, getFacebookAdsAnalytics, getTikTokAnalytics, buildSocialSummary } from "@/lib/social-analytics";
import { DEBACKERS_PROFILE, analyzeMarketGaps, generateCompetitorInsightSummary } from "@/lib/competitor-intelligence";
import { getSeasonalContext, EGYPTIAN_FASHION_SYSTEM_PROMPT } from "@/lib/egyptian-context";
import { getCachedReport, CACHE_KEYS } from "@/lib/cache";
import { RichTrend } from "@/lib/trend-engine";
import { CompetitorIntelligence } from "@/lib/competitor-intelligence";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { month, year } = await request.json();

  if (!month || !year) {
    return NextResponse.json({ error: "month and year required" }, { status: 400 });
  }

  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" });

  try {
    // ── Gather all data in parallel ──────────────────────────────────
    const [salesData, ig, fbAds, tt, marketGaps, competitorBriefing] = await Promise.all([
      getSalesData(),
      getInstagramAnalytics(),
      getFacebookAdsAnalytics(),
      getTikTokAnalytics(),
      analyzeMarketGaps(),
      generateCompetitorInsightSummary(month, year),
    ]);

    const seasonalContext = getSeasonalContext(month, year);
    const salesSummary = buildSalesSummary(salesData);
    const socialSummary = buildSocialSummary(ig, fbAds, tt);

    // 🟢 LIVE competitors (from the Competitors page's last live research)
    const cachedComp = await getCachedReport<{ competitors: CompetitorIntelligence[] }>(CACHE_KEYS.competitors);
    const competitorSummary = cachedComp?.data?.competitors?.length
      ? cachedComp.data.competitors.map((c) =>
          `${c.name} (threat: ${c.threatLevel}):
          - What they're doing: ${(c.insights ?? []).slice(0, 3).join(" | ")}
          - Pricing: ${c.pricingStrategy}
          - Gaps to exploit: ${(c.gaps ?? []).slice(0, 3).join(" | ")}`
        ).join("\n\n")
      : "No live competitor research yet — run the Competitors page to populate this.";

    // 🟢 LIVE trends (from the Trend Engine's last live scan)
    const cachedTrends = await getCachedReport<RichTrend[]>(CACHE_KEYS.trends);
    const trendsSummary = cachedTrends?.data?.length
      ? "LIVE TRENDS:\n" + cachedTrends.data
          .map((t) => `- ${t.name} (${t.platform}, score ${t.trendScore}): ${t.description}`)
          .join("\n")
      : "No live trend scan yet — run the Trend Engine to populate this.";

    // ── Claude Sonnet — Full Monthly Campaign Plan ────────────────────
    const prompt = `
Generate a COMPLETE monthly marketing campaign plan for ${monthName} ${year} for DEBACKERS EGYPT.

═══════════════════════════════════════════
BRAND: DEBACKERS
${DEBACKERS_PROFILE.positioning}
Stores: ${DEBACKERS_PROFILE.stores}
Audience: ${DEBACKERS_PROFILE.audience}
Price range: ${DEBACKERS_PROFILE.priceRange}
Unique advantages: ${DEBACKERS_PROFILE.uniqueAdvantages.join(" | ")}
═══════════════════════════════════════════

SHOPIFY SALES DATA:
${salesSummary}

SOCIAL MEDIA PERFORMANCE:
${socialSummary}

COMPETITOR INTELLIGENCE:
${competitorSummary}

COMPETITOR BRIEFING ${monthName}:
${competitorBriefing}

MARKET GAPS TO EXPLOIT:
${marketGaps.map((g, i) => `${i + 1}. ${g}`).join("\n")}

TRENDS ACTIVE NOW:
${trendsSummary}

EGYPTIAN SEASONAL CONTEXT:
Current season: ${seasonalContext.current}
Seasonal recommendations: ${seasonalContext.recommendations.slice(0, 4).join(" | ")}
Upcoming: ${seasonalContext.upcoming.map((u) => `${u.season} in ${u.daysAway} days`).join(", ")}

═══════════════════════════════════════════
INSTRUCTIONS:
1. Generate 5–7 campaigns for ${monthName}
2. Each campaign must exploit a REAL gap or trend above
3. Never copy competitor strategies — find the gap they leave open
4. Justify EVERY campaign with specific data points from above
5. Include Arabic hooks (Egyptian dialect) for each campaign
6. Assign confidence score 0–100 based on data strength
7. Prioritize women's segment — no competitor owns this space
8. Include a "hero campaign" (biggest budget, highest confidence)

Return a JSON object with this structure:
{
  "monthSummary": "2-3 sentence strategic overview for ${monthName}",
  "heroInsight": "The single biggest opportunity this month in one sentence",
  "campaigns": [
    {
      "id": "unique-id",
      "name": "Campaign Name",
      "type": "hero|supporting|always-on",
      "objective": "What this achieves",
      "audience": "Specific segment",
      "offer": "The hook or offer",
      "platforms": ["instagram", "tiktok", "facebook", "email"],
      "contentTypes": ["reel", "carousel", "story", "tiktok-video", "email"],
      "hooks": ["Arabic hook 1", "English hook 2"],
      "captions": ["Full Arabic caption sample"],
      "cta": "Call to action",
      "visualDirection": "Visual style and setting description",
      "weekOfMonth": 1,
      "budgetPriority": "high|medium|low",
      "estimatedKPIs": {
        "reach": 0,
        "engagement": 0,
        "conversions": 0,
        "revenue": 0
      },
      "confidenceScore": 85,
      "explanation": "Recommended because: [specific data points]",
      "competitorGap": "Which competitor gap this exploits",
      "dataSignals": ["signal 1", "signal 2", "signal 3"]
    }
  ],
  "weeklyCalendar": {
    "week1": ["Campaign names for week 1"],
    "week2": ["Campaign names for week 2"],
    "week3": ["Campaign names for week 3"],
    "week4": ["Campaign names for week 4"]
  },
  "contentPlan": {
    "totalPosts": 0,
    "instagram": 0,
    "tiktok": 0,
    "facebook": 0,
    "email": 0
  },
  "budgetAllocation": {
    "instagram": 0,
    "tiktok": 0,
    "facebook": 0,
    "email": 0
  }
}

Return ONLY valid JSON. No markdown. No extra text.
`;

    const text = await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 6000);

    let plan;
    try {
      plan = JSON.parse(text);
    } catch {
      throw new Error("Gemini returned invalid JSON — try again");
    }

    return NextResponse.json({
      plan,
      dataUsed: {
        shopify: salesData.isLive,        // 🟢 real
        instagram: false,                 // 🔴 not connected (needs Meta API)
        facebookAds: false,               // 🔴 not connected (needs Meta API)
        tiktok: false,                    // 🔴 not connected (needs TikTok API)
        competitors: cachedComp?.data?.competitors?.map((c) => c.name) ?? [],
        trends: cachedTrends?.data?.length ?? 0,
        marketGaps: marketGaps.length,
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("[Monthly Plan] Error:", error);
    return NextResponse.json(
      { error: error.message ?? "Plan generation failed" },
      { status: 500 }
    );
  }
}
