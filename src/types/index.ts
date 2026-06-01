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
  growth: number;
  category: string;
}

export interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  conversionRate: number;
  weeklyGrowth: number;
  repeatPurchaseRate: number;
  abandonedCarts: number;
  topProducts: TopProduct[];
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
