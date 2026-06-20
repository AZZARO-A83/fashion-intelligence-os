// AI client — uses Groq (free) under the hood
import { callGemini } from "./gemini";
import { EGYPTIAN_FASHION_SYSTEM_PROMPT } from "./egyptian-context";

// Robust JSON parse — strips markdown fences / stray prose around the JSON
// so Groq's occasional extra text doesn't break generation.
function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json\n?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}
import {
  Campaign,
  CampaignGenerationInput,
  ContentGenerationInput,
  GeneratedContent,
  SalesData,
  Trend,
} from "@/types";

// ─── Campaign Generator ──────────────────────────────────────────────
export async function generateMonthlyCampaigns(
  input: CampaignGenerationInput
): Promise<Campaign[]> {
  const monthName = new Date(input.year, input.month - 1).toLocaleString("en-US", { month: "long" });

  const prompt = `
Generate a data-driven monthly campaign plan for ${monthName} ${input.year} for an Egyptian fashion brand called DEBACKERS.

BRAND CONTEXT:
${input.brandContext}

SHOPIFY SALES SUMMARY:
${input.salesSummary}

CURRENT TRENDS:
${input.trendsSummary}

COMPETITOR ACTIVITY:
${input.competitorSummary}

${input.focus ? `SPECIAL FOCUS: ${input.focus}` : ""}

INSTRUCTIONS:
1. Analyze the data above to find real opportunities
2. Do NOT copy competitor ideas — find the gap they are missing
3. Generate 4–6 campaigns for the month — BALANCE men's and women's (don't skew one gender)
4. Each campaign must be justified by specific data points
5. Assign a confidence score (0–100) based on how strongly the data supports the campaign

CAMPAIGN-CRAFT FRAMEWORK (apply to every campaign):
- HOOKS must use a real formula (curiosity / bold claim / relatable pain) — never a generic line. First line earns the watch.
- Sell the BENEFIT + the moment, not the product label ("the blazer that takes you from a Sahel lunch to a wedding" > "navy blazer").
- Be SPECIFIC: name colour, fabric, fit, occasion, and the real Egyptian moment (salary week 25–30th, North Coast season, an upcoming event from the calendar).
- Arabic hooks in Egyptian dialect (عامية مصرية) — how people actually talk, not formal.
- Tie each campaign to a REAL signal from the data above (a best-seller, a live trend, a competitor gap).

Return a JSON array of campaigns. Each campaign must follow this exact structure:
[
  {
    "name": "Campaign Name",
    "objective": "What this campaign achieves",
    "audience": "Specific segment (e.g., Women 22-30 Cairo)",
    "offer": "The offer or hook",
    "platforms": ["instagram", "tiktok"],
    "contentTypes": ["reel", "carousel"],
    "hooks": ["Hook 1 in Egyptian Arabic", "Hook 2 in English"],
    "captions": ["Full caption in Arabic"],
    "cta": "Call to action text",
    "visualDirection": "Description of visual style",
    "estimatedKPIs": {
      "reach": 50000,
      "engagement": 3500,
      "conversions": 120,
      "revenue": 95000
    },
    "confidenceScore": 82,
    "explanation": "Recommended because: [specific data points from above]"
  }
]

Return ONLY valid JSON array, no markdown or extra text.
`;

  const text = await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 4000);

  try {
    const campaigns = parseJson<Omit<Campaign, "id" | "month" | "year" | "status">[]>(text);
    return campaigns.map((c, i) => ({
      ...c,
      id: `gen-${Date.now()}-${i}`,
      month: input.month,
      year: input.year,
      status: "DRAFT" as const,
    }));
  } catch {
    throw new Error("Failed to parse AI campaign response");
  }
}

// ─── Content Generator ───────────────────────────────────────────────
export async function generateContent(input: ContentGenerationInput): Promise<GeneratedContent> {
  const languageInstruction =
    input.language === "ar-eg"
      ? "Write entirely in Egyptian Arabic colloquial dialect (عامية مصرية). Use natural Egyptian expressions and slang."
      : input.language === "mixed"
      ? "Write in a natural mix of Egyptian Arabic and English — switch as young Egyptians do on social media."
      : "Write in English with Egyptian cultural references.";

  const typeInstructions: Record<string, string> = {
    TIKTOK_SCRIPT: "Create a TikTok video script with: hook (first 2 seconds), main content sections with timestamps, and outro CTA.",
    REEL_IDEA: "Create an Instagram Reel concept with: hook, visual sequence steps, music suggestion, caption, and hashtags.",
    CAROUSEL: "Create a carousel post plan: slide 1 hook, slides 2-5 content, final slide CTA, and caption.",
    CAPTION: "Write a compelling social media caption with emojis, call to action, and relevant hashtags.",
    EMAIL: "Write a full email: subject line, preview text, header, body paragraphs, CTA button text, and PS line.",
    AD_COPY: "Write ad copy with: primary text (125 chars), headline (40 chars), description (30 chars), and CTA. Give 3 variants.",
    INFLUENCER_BRIEF: "Write a complete influencer brief: brand context, deliverables, talking points, dos and don'ts, posting guidelines.",
    UGC_SCRIPT: "Write a UGC script that feels organic and authentic — NOT like a polished ad. Natural, relatable.",
  };

  const prompt = `
Create ${input.type.replace(/_/g, " ").toLowerCase()} content for DEBACKERS — Egyptian premium fashion brand.

LANGUAGE RULE: ${languageInstruction}

TOPIC: ${input.topic}
${input.productName ? `PRODUCT: ${input.productName}` : ""}
${input.campaignName ? `CAMPAIGN: ${input.campaignName}` : ""}
AUDIENCE: ${input.targetAudience || "Egyptian fashion shoppers 18–45"}
TONE: ${input.tone || "Casual, authentic, relatable"}
PLATFORM: ${input.platform}

FORMAT: ${typeInstructions[input.type] ?? "Create compelling marketing content."}

WRITING FRAMEWORK (apply all — this is what makes content convert):
- HOOK: the first line decides if anyone watches/reads. Use a real hook formula — curiosity ("the real reason X isn't what you think"), specificity, a bold claim, or a relatable pain. Never a generic greeting.
- BENEFITS over features: don't say "linen shirt" — say what it does for them ("stays cool through a North Coast day, dinner-ready by night").
- SPECIFIC over vague: name the colour, fabric, fit, occasion. Avoid "stylish", "elegant", "premium quality" alone.
- CUSTOMER LANGUAGE: write how a young Egyptian actually talks/searches, not brand-speak.
- SHOW don't tell, CONFIDENT not hedged. One clear idea, one clear action.
- Tie to a real moment (season, salary week 25–30th, North Coast, an event) when relevant.

CRITICAL LANGUAGE PURITY: write ONLY in the requested language (Egyptian Arabic and/or English). NEVER insert Chinese, Spanish, French, or any other foreign words or characters. Hashtags must be Arabic or English only. Proofread — no stray non-Arabic/English tokens.

Return a JSON object ONLY:
{
  "title": "Content piece title",
  "body": "Full content body",
  "hook": "Opening hook — first line only",
  "cta": "Call to action",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "notes": "Production or posting tips"
}

Return ONLY valid JSON. No markdown. No explanation.
`;

  const text = await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 1500);

  try {
    return parseJson<GeneratedContent>(text);
  } catch {
    throw new Error("Failed to parse AI content response");
  }
}

// ─── Sales Insight Analyzer ──────────────────────────────────────────
function salesGrowthLabel(growth: number | null): string {
  return growth === null ? "no prior-period data" : `${growth > 0 ? "+" : ""}${growth}% growth`;
}

function fallbackSalesInsights(salesData: SalesData): string[] {
  const topRevenue = salesData.topProducts[0];
  const topUnits = salesData.topByUnits?.[0];
  const low = salesData.lowProducts[0];
  const insights: string[] = [];

  if (topRevenue) {
    insights.push(`${topRevenue.name} is the revenue leader: EGP ${topRevenue.revenue.toLocaleString()} from ${topRevenue.units} units. Use it as the main creative and landing-page product.`);
  }
  if (topUnits) {
    insights.push(`${topUnits.name} is the unit leader with ${topUnits.units} units sold. Use it for bundles, reels, and retargeting because it shows stronger purchase frequency.`);
  }
  if (salesData.recoveryOpportunity) {
    insights.push(`Abandoned cart recovery can target about EGP ${salesData.recoveryOpportunity.toLocaleString()} in recoverable value. Start with WhatsApp/SMS before increasing ad spend.`);
  }
  if (salesData.avgOrderValue) {
    insights.push(`Average order value is EGP ${salesData.avgOrderValue.toLocaleString()}. Add complementary products near EGP 800-2,500 to lift checkout value.`);
  }
  if (low) {
    insights.push(`${low.name} has low movement at ${low.units} units. Test a bundle, styling angle, or temporary placement before markdown.`);
  }

  return insights.slice(0, 5);
}

export async function analyzeSalesData(salesData: SalesData): Promise<string[]> {
  const prompt = `
Analyze this Shopify sales data for DEBACKERS Egypt and generate 5 specific, actionable insights.

SALES DATA:
- Total Revenue: EGP ${salesData.totalRevenue.toLocaleString()}
- Total Orders: ${salesData.totalOrders}
- Avg Order Value: EGP ${salesData.avgOrderValue}
- Conversion Rate: ${salesData.conversionRateSource === "ga4-live" ? `${salesData.conversionRate}% live (Shopify orders / GA4 sessions: ${salesData.conversionPurchases} purchases, ${salesData.conversionSessions} sessions)` : "Unavailable - GA4 sessions not connected"}
- Weekly Growth: ${salesData.weeklyGrowth}%
- Repeat Purchase Rate: ${salesData.repeatPurchaseRate}%
- Abandoned Carts: ${salesData.abandonedCarts}

TOP PRODUCTS:
${salesData.topProducts.map((p) => `- ${p.name}: ${p.category}, EGP ${p.revenue} revenue, ${p.units} units, ${salesGrowthLabel(p.growth)}`).join("\n")}

TOP BY UNITS:
${(salesData.topByUnits ?? []).map((p) => `- ${p.name}: ${p.category}, ${p.units} units, EGP ${p.revenue} revenue`).join("\n")}

LOW PERFORMING:
${salesData.lowProducts.map((p) => `- ${p.name}: ${p.category}, EGP ${p.revenue} revenue, ${p.units} units, ${salesGrowthLabel(p.growth)}`).join("\n")}

Generate exactly 5 insight strings. Be specific with numbers. Like:
"Linen shirts increased by 32% in the last 14 days — strong signal for summer push."

Return a JSON array of 5 strings ONLY. No markdown.
`;

  const text = await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 800);

  try {
    return parseJson<string[]>(text);
  } catch {
    return fallbackSalesInsights(salesData);
  }
}
// ─── Trend Analyzer ──────────────────────────────────────────────────
export async function analyzeTrendRelevance(
  trends: Trend[],
  brandContext: string
): Promise<Record<string, string>> {
  const prompt = `
For DEBACKERS Egyptian fashion brand, explain why each trend below matters and how to act on it.

BRAND: ${brandContext}

TRENDS:
${trends.map((t) => `- ${t.name} (${t.platform}): score ${t.trendScore}, growth +${t.growthRate}%`).join("\n")}

Return a JSON object: { "trendName": "1-2 sentence explanation + action", ... }
Return ONLY valid JSON. No markdown.
`;

  const text = await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 1000);

  try {
    return parseJson<Record<string, string>>(text);
  } catch {
    return {};
  }
}
