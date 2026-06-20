// ─── Sales & Shopify ────────────────────────────────────────────────
export interface SalesInsight {
  metric: string;
  value: string;
  change: number;
  trend: "up" | "down" | "stable";
  explanation: string;
}

export interface TopProduct {
  name: string;
  revenue: number;
  units: number;
  growth: number | null;
  category: string;
  family?: string;
  variants?: number;
  method?: "revenue" | "units" | "category-diverse";
}

export interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  conversionRate: number;
  conversionRateSource?: "ga4-live" | "unavailable";
  conversionSessions?: number;
  conversionPurchases?: number;
  weeklyGrowth: number;
  ordersGrowth?: number;
  aovGrowth?: number;
  repeatPurchaseRate: number;
  abandonedCarts: number;
  recoveryOpportunity?: number;
  topProducts: TopProduct[];     // top 10 by revenue
  topByUnits?: TopProduct[];     // top 10 by units sold (surfaces cheaper high-volume items)
  lowProducts: TopProduct[];
  insights: SalesInsight[];
  revenueByDay: { date: string; revenue: number; orders: number }[];
}

// ─── Trends ─────────────────────────────────────────────────────────
export interface Trend {
  id: string;
  name: string;
  platform: "tiktok" | "instagram" | "meta";
  trendScore: number;
  growthRate: number;
  relevanceScore: number;
  expectedPeakDays: number;
  hashtags: string[];
  sounds: string[];
  category: "aesthetic" | "color" | "style" | "product" | "sound";
  description: string;
}

// ─── Campaigns ───────────────────────────────────────────────────────
export interface Campaign {
  id: string;
  name: string;
  objective: string;
  audience: string;
  offer?: string;
  platforms: string[];
  contentTypes: string[];
  hooks: string[];
  captions: string[];
  cta?: string;
  visualDirection?: string;
  estimatedKPIs: {
    reach: number;
    engagement: number;
    conversions: number;
    revenue: number;
  };
  confidenceScore: number;
  explanation: string;
  month: number;
  year: number;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "PAUSED";
  imageReferences?: ImageReference[];
}

export interface CampaignGenerationInput {
  month: number;
  year: number;
  brandContext: string;
  salesSummary: string;
  trendsSummary: string;
  competitorSummary: string;
  focus?: string;
}

// ─── Image References ────────────────────────────────────────────────
export interface ImageReference {
  url: string;
  category: "mood" | "product" | "ad" | "content" | "styling" | "color";
  reason: string;
  tags: string[];
  style: string;
}

// ─── Competitors ─────────────────────────────────────────────────────
export interface Competitor {
  id: string;
  name: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  facebookPage?: string;
  website?: string;
  snapshot?: CompetitorSnapshot;
}

export interface CompetitorSnapshot {
  instagramPosts: number;
  avgEngagement: number;
  topHashtags: string[];
  contentThemes: string[];
  postingFrequency: number;
  tiktokVideos: number;
  insights: string[];
}

// ─── Content ─────────────────────────────────────────────────────────
export type ContentType =
  | "TIKTOK_SCRIPT"
  | "REEL_IDEA"
  | "CAROUSEL"
  | "CAPTION"
  | "EMAIL"
  | "AD_COPY"
  | "INFLUENCER_BRIEF"
  | "UGC_SCRIPT";

export type Language = "ar-eg" | "en" | "mixed";

export interface ContentGenerationInput {
  type: ContentType;
  platform: string;
  language: Language;
  topic: string;
  campaignName?: string;
  productName?: string;
  targetAudience?: string;
  tone?: string;
}

export interface GeneratedContent {
  title: string;
  body: string;
  hook?: string;
  cta?: string;
  hashtags: string[];
  notes?: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────
export interface DashboardStats {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  avgOrderValue: number;
  aovGrowth: number;
  activeCampaigns: number;
  topTrend: string;
  trendScore: number;
}

// ─── Agency Intelligence ─────────────────────────────────────────────
export interface ResearchTrend {
  name: string;
  platform: string;
  why: string;
  howToUse: string;
  urgency: "high" | "medium" | "low";
  hashtags: string[];
}

export interface CampaignIdea {
  name: string;
  objective: string;
  audience: string;
  hook_ar: string;
  hook_en: string;
  format: string;
  timing: string;
  confidence: number;
  whyNow: string;
}

export interface CompetitorMove {
  competitor: string;
  observation: string;
  gap: string;
  action: string;
}

export interface FlashBrief {
  generatedAt: string;
  period: string;
  season: string;
  dataSource: "ai-research";
  marketPulse: string;
  trends: ResearchTrend[];
  hooks: string[];
  campaignIdeas: CampaignIdea[];
  competitorMoves: CompetitorMove[];
  urgentActions: string[];
  forCreators: {
    readyHooks: string[];
    captionFormulas: string[];
    hashtagSets: string[][];
    visualDirections: string[];
  };
}

export interface WeeklyBrief {
  generatedAt: string;
  weekOf: string;
  executiveSummary: string;
  topOpportunities: string[];
  campaigns: CampaignIdea[];
  competitorWatch: CompetitorMove[];
  contentPlan: {
    day: string;
    platform: string;
    format: string;
    topic: string;
    hook: string;
  }[];
  kpiTargets: {
    metric: string;
    target: string;
    rationale: string;
  }[];
}

export interface MonthlyStrategy {
  generatedAt: string;
  month: string;
  executiveSummary: string;
  marketAnalysis: string;
  seasonalStrategy: string;
  campaignCalendar: {
    week: string;
    focus: string;
    campaigns: string[];
    platforms: string[];
  }[];
  budgetRecommendation: string;
  competitorStrategy: string;
  kpiForecast: {
    metric: string;
    forecast: string;
    basis: string;
  }[];
  metaAdsNote: string;
}

// ─── Egyptian Seasonal Context ───────────────────────────────────────
export type EgyptianSeason =
  | "ramadan"
  | "eid_fitr"
  | "eid_adha"
  | "summer"
  | "winter"
  | "back_to_school"
  | "black_friday"
  | "wedding_season"
  | "normal";

export interface SeasonalContext {
  current: EgyptianSeason;
  upcoming: { season: EgyptianSeason; daysAway: number }[];
  recommendations: string[];
}
