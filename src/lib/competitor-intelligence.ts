import { callGemini } from "./gemini";
import { EGYPTIAN_FASHION_SYSTEM_PROMPT } from "./egyptian-context";

export interface CompetitorIntelligence {
  name: string;
  website?: string;
  websiteData?: string;
  metaAdsUrl: string;
  insights: string[];
  campaigns: DetectedCampaign[];
  contentThemes: string[];
  pricingStrategy: string;
  gaps: string[];
  threatLevel: "low" | "medium" | "high";
  lastUpdated: string;
}

export interface DetectedCampaign {
  name: string;
  theme: string;
  offer?: string;
  platforms: string[];
  estimatedBudget: string;
  targetAudience: string;
}

// Real competitor data from research
export const COMPETITOR_DATABASE: CompetitorIntelligence[] = [
  {
    name: "Tie House",
    website: "https://tiehouse.ae",
    metaAdsUrl: "https://www.facebook.com/ads/library/?country=EG&q=tie+house",
    insights: [
      "2.3M Facebook likes — largest social following in Egyptian men's fashion",
      "96 branches Egypt-wide — dominant physical retail presence",
      "Heavy discounting strategy: up to 72% off suits, 50% off shirts constantly",
      "Celebrity campaign with footballer Mohamed Zidan — aspirational but mass market",
      "App-exclusive 20% discount — driving mobile app installs",
      "Men ONLY — zero women's offering, leaving 50% of market untouched",
      "Instagram: 223K followers, 3,743 posts — consistent high-volume posting",
      "Pricing: T-shirts from 32 AED, suits discounted to 375 AED — volume play",
    ],
    campaigns: [
      {
        name: "Celebrity Summer Sale",
        theme: "Mohamed Zidan x Tie House — suits for every lifestyle",
        offer: "Up to 72% off suits",
        platforms: ["facebook", "instagram", "tv"],
        estimatedBudget: "High (EGP 500K+)",
        targetAudience: "Egyptian men 25–45",
      },
      {
        name: "App Download Push",
        theme: "Download our app, get 20% off first order",
        offer: "20% app-exclusive discount",
        platforms: ["facebook", "instagram"],
        estimatedBudget: "Medium",
        targetAudience: "Egyptian men 20–35, mobile-first",
      },
    ],
    contentThemes: ["celebrity", "discount", "suits", "mass-market", "men-only", "lifestyle"],
    pricingStrategy: "Volume discounting — high markdown, high turnover. Constant sale state.",
    gaps: [
      "No women's line — leaves 50% of Egyptian fashion market open",
      "No premium positioning — race to the bottom on price",
      "No TikTok strategy — missing 18–28 male segment",
      "No cultural/Egyptian identity content",
      "No co-ord sets or trending aesthetics",
    ],
    threatLevel: "high",
    lastUpdated: new Date().toISOString(),
  },
  {
    name: "British House",
    website: "https://www.britishhouse.shop",
    metaAdsUrl: "https://www.facebook.com/ads/library/?country=EG&q=british+house",
    insights: [
      "135K Instagram followers — strong but niche audience",
      "Premium men's shirts ONLY — very narrow product focus",
      "Pricing: EGP 2,345–3,545 per shirt — upper premium segment",
      "SS26 push: Belgian Linen 'Nature's Crest', 'Aero-Hybrid Capsule' — innovation narrative",
      "Stores in premium locations: Mivida New Cairo, Sheikh Zayed, Stars",
      "Quality narrative: Giza 87 cotton, Belgian Linen, Italian design",
      "No women's line — zero reach to female Egyptian shoppers",
      "Limited TikTok presence — weak with younger demographic",
    ],
    campaigns: [
      {
        name: "Belgian Linen SS26",
        theme: "Nature's Crest — premium linen for summer",
        offer: "New collection — full price",
        platforms: ["instagram"],
        estimatedBudget: "Medium",
        targetAudience: "Affluent Egyptian men 30–50",
      },
      {
        name: "Aero-Hybrid Capsule",
        theme: "Wear The Future — tech performance shirts",
        offer: "New arrivals",
        platforms: ["instagram", "website"],
        estimatedBudget: "Low-Medium",
        targetAudience: "Corporate Egyptian men 28–45",
      },
    ],
    contentThemes: ["premium", "craftsmanship", "linen", "corporate", "men-shirts", "quality"],
    pricingStrategy: "Premium full-price. No discounting. Quality justification strategy.",
    gaps: [
      "No women's offering — massive missed opportunity",
      "Very narrow product range — shirts only, no full wardrobe",
      "Limited casual range — missing 18–30 smart casual and semi-formal segment",
      "Premium price locks out mid-market Egyptian consumers",
      "Weak TikTok and youth social presence",
    ],
    threatLevel: "medium",
    lastUpdated: new Date().toISOString(),
  },
  {
    name: "Massimo Dutti Egypt",
    website: "https://www.massimodutti.com/eg/en/",
    metaAdsUrl: "https://www.facebook.com/ads/library/?country=EG&q=massimo+dutti",
    insights: [
      "International luxury brand (Inditex group) — global marketing budget",
      "Egypt stores: Citystars Heliopolis + Mall of Egypt — premium mall positioning",
      "Price point far above Egyptian average — aspirational, not accessible",
      "Men + Women collections — full wardrobe offering",
      "Strong brand equity but zero Egyptian cultural connection",
      "Global campaigns localized minimally for Egypt market",
      "No Arabic content — misses Egyptian audience connection",
      "High aspirational value but low conversion for mid-market Egyptians",
    ],
    campaigns: [
      {
        name: "SS26 Global Collection",
        theme: "International luxury summer — linen, tailoring, elegance",
        offer: "New season — full price",
        platforms: ["instagram", "facebook", "website"],
        estimatedBudget: "Very High (global budget)",
        targetAudience: "Affluent Egyptians, expats, 28–50",
      },
    ],
    contentThemes: ["international", "luxury", "editorial", "aspirational", "global-trends"],
    pricingStrategy: "International luxury pricing — EGP far above local brands. Aspirational positioning.",
    gaps: [
      "No Arabic content — no Egyptian cultural resonance",
      "Price prohibitive for most Egyptian shoppers",
      "No local Egyptian identity or cultural connection",
      "No TikTok Egypt strategy",
      "Mall-only — no local neighborhood accessibility",
    ],
    threatLevel: "low",
    lastUpdated: new Date().toISOString(),
  },
];

// Brand context for Debackers
export const DEBACKERS_PROFILE = {
  name: "Debackers",
  founded: "1986",
  origin: "Belgian family brand",
  stores: "13 stores across 7 Egyptian governorates",
  audience: "Men and women, 18–45",
  positioning: "Premium Casual, Semi-Casual & Formal Fashion for Men & Women Who Lead with Style",
  priceRange: "EGP 2,495–4,995 (sets), mid-to-premium",
  instagram: "@de_backers",
  facebook: "@Debackers.egy",
  website: "de-backers.com",
  uniqueAdvantages: [
    "European heritage (Belgian) + Egyptian market expertise",
    "Full men + women wardrobe — competitors only do men",
    "Premium but accessible pricing vs Massimo Dutti",
    "13 stores + online — stronger reach than British House",
    "Quality positioning without Tie House's discount-brand stigma",
  ],
  currentCampaigns: [
    "50% off promotion (countdown timer)",
    "Drop 1 — new arrivals launch",
    "Shop the Reel content strategy",
    "Create Your Perfect Suit customization",
  ],
};

// Generate market gap analysis using Claude Haiku (cheap)
export async function analyzeMarketGaps(): Promise<string[]> {
  const competitorSummary = COMPETITOR_DATABASE.map((c) =>
    `${c.name}: ${c.gaps.join(" | ")}`
  ).join("\n");

  const prompt = `
Based on this Egyptian fashion competitor gap analysis, identify the TOP 6 market opportunities for Debackers:

COMPETITORS:
${competitorSummary}

DEBACKERS STRENGTHS:
${DEBACKERS_PROFILE.uniqueAdvantages.join("\n")}

Return JSON array of 6 specific, actionable opportunity strings. Be specific to Egypt market.
Each opportunity = one sentence starting with an action verb.
`;

  try {
    const text = await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 600);
    return JSON.parse(text);
  } catch {
    return [
      "Own the women's segment — zero competition from Tie House or British House",
      "Position as 'premium but Egyptian' vs Massimo Dutti's foreign luxury",
      "Launch TikTok strategy targeting 18–28 — competitors have no presence",
      "Push full-wardrobe campaigns — competitors only market shirts or suits",
      "Build Egyptian cultural identity content — no competitor doing this",
      "Target mid-premium gap between Tie House discounts and Massimo Dutti luxury",
    ];
  }
}

// Generate monthly intelligence update using Haiku
export async function generateCompetitorInsightSummary(month: number, year: number): Promise<string> {
  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" });

  const prompt = `
Write a 3-paragraph competitor intelligence briefing for ${monthName} ${year} for Debackers Egypt.

COMPETITOR DATA:
- Tie House: ${COMPETITOR_DATABASE[0].insights.slice(0, 4).join(" | ")}
- British House: ${COMPETITOR_DATABASE[1].insights.slice(0, 4).join(" | ")}
- Massimo Dutti: ${COMPETITOR_DATABASE[2].insights.slice(0, 3).join(" | ")}

Include:
1. What competitors are doing THIS month (seasonal)
2. What gaps Debackers should exploit
3. One specific campaign idea to counter competition

Keep it tactical. Egypt market focus. Max 200 words.
`;

  try {
    return await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 400);
  } catch {
    return `${monthName} competitor briefing: Tie House running heavy summer discounts but ignoring women's segment. British House pushing premium linen but too niche. Massimo Dutti has global budget but zero Egyptian cultural connection. Debackers opportunity: own the women's summer story and the "European quality, Egyptian heart" positioning that no competitor touches.`;
  }
}
