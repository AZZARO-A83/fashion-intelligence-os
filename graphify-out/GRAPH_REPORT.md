# Graph Report - C:/Users/User/fashion-intelligence-os  (2026-06-01)

## Corpus Check
- Corpus is ~32,042 words - fits in a single context window. You may not need a graph.

## Summary
- 462 nodes · 772 edges · 39 communities (26 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_UI Utilities & Styling|UI Utilities & Styling]]
- [[_COMMUNITY_AI Engine (GroqGemini)|AI Engine (Groq/Gemini)]]
- [[_COMMUNITY_Egyptian Market Context|Egyptian Market Context]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_API Routes (POST)|API Routes (POST)]]
- [[_COMMUNITY_Badge & UI Components|Badge & UI Components]]
- [[_COMMUNITY_Trend Intelligence|Trend Intelligence]]
- [[_COMMUNITY_Campaign Generation|Campaign Generation]]
- [[_COMMUNITY_Sales & Shopify Data|Sales & Shopify Data]]
- [[_COMMUNITY_Agency Intelligence Reports|Agency Intelligence Reports]]
- [[_COMMUNITY_Competitor Intelligence|Competitor Intelligence]]
- [[_COMMUNITY_Pages & Navigation|Pages & Navigation]]
- [[_COMMUNITY_Mock Data Layer|Mock Data Layer]]
- [[_COMMUNITY_Social Analytics|Social Analytics]]
- [[_COMMUNITY_Content Generation|Content Generation]]
- [[_COMMUNITY_Dashboard & Analytics|Dashboard & Analytics]]
- [[_COMMUNITY_Research Engine|Research Engine]]
- [[_COMMUNITY_Types & Interfaces|Types & Interfaces]]
- [[_COMMUNITY_Product Management|Product Management]]
- [[_COMMUNITY_Auth & Config|Auth & Config]]
- [[_COMMUNITY_Trend Alerts|Trend Alerts]]
- [[_COMMUNITY_Monthly Plan|Monthly Plan]]
- [[_COMMUNITY_Inspiration & Media|Inspiration & Media]]
- [[_COMMUNITY_Score & Stats UI|Score & Stats UI]]
- [[_COMMUNITY_Prisma & Database|Prisma & Database]]
- [[_COMMUNITY_Shopify Real Connector|Shopify Real Connector]]
- [[_COMMUNITY_Trend Engine|Trend Engine]]
- [[_COMMUNITY_Trend Scanner|Trend Scanner]]
- [[_COMMUNITY_Layout & Navigation|Layout & Navigation]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Flash Brief Flow|Flash Brief Flow]]
- [[_COMMUNITY_Weekly Report Flow|Weekly Report Flow]]
- [[_COMMUNITY_Monthly Strategy Flow|Monthly Strategy Flow]]
- [[_COMMUNITY_Page Header|Page Header]]
- [[_COMMUNITY_Product Suggestions|Product Suggestions]]
- [[_COMMUNITY_Alert Badge|Alert Badge]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 28 edges
2. `callGemini()` - 19 edges
3. `Egyptian Fashion System Prompt` - 19 edges
4. `compilerOptions` - 16 edges
5. `POST()` - 12 edges
6. `Badge()` - 12 edges
7. `callGemini (Groq Llama 3.3 70B) Function` - 12 edges
8. `PageHeader()` - 11 edges
9. `formatNumber()` - 11 edges
10. `scripts` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Research Engine Library` --references--> `Anthropic AI SDK (@anthropic-ai/sdk)`  [INFERRED]
  src/lib/research-engine.ts → package.json
- `Root Layout` --references--> `Tailwind Config`  [INFERRED]
  src/app/layout.tsx → tailwind.config.ts
- `Claude AI Library` --references--> `Anthropic AI SDK (@anthropic-ai/sdk)`  [INFERRED]
  src/lib/claude.ts → package.json
- `CompetitorCard()` --calls--> `cn()`  [EXTRACTED]
  src/app/competitors/page.tsx → src/lib/utils.ts
- `DataSourceBadge()` --calls--> `cn()`  [EXTRACTED]
  src/app/monthly-plan/page.tsx → src/lib/utils.ts

## Hyperedges (group relationships)
- **Agency Intelligence Report Generation Flow** — page_agencyflash, page_agencymonthly, page_agencyweekly, api_agencyflash, api_agencymonthly, api_agencyweekly, lib_researchengine [EXTRACTED 1.00]
- **Campaign Generation Data Flow** — api_campaignsgenerate, lib_claude, lib_mockdata, lib_egyptiancontext, types_campaigngenerationinput, dep_anthropicsdk [EXTRACTED 0.95]
- **Dashboard Data Flow** — page_dashboard, api_dashboard, component_statcard, component_scorering, dep_recharts [EXTRACTED 0.95]
- **Analytics Page Mock Data Flow** — page_analytics, lib_mockdata, dep_recharts, component_pageheader, component_badge [EXTRACTED 1.00]
- **Monthly Plan Multi-Source Data Aggregation** — api_monthly_plan_route, lib_shopify, lib_social_analytics, lib_competitor_intelligence, lib_trend_engine, lib_egyptian_context, lib_gemini [EXTRACTED 1.00]
- **Campaigns Page Full Flow** — page_campaigns, api_campaigns_route, component_product_suggestions, api_products_route, component_page_header [EXTRACTED 0.95]
- **Trend Alert Monitoring System** — component_alert_badge, api_trends_scan_route, lib_trend_scanner, lib_trend_alerts, page_trends_alerts [EXTRACTED 0.95]
- **All AI Functions Call Groq via callGemini** — lib_claude_generateMonthlyCampaigns, lib_claude_generateContent, lib_claude_analyzeSalesData, lib_claude_analyzeTrendRelevance, lib_competitor_intelligence_analyzeMarketGaps, lib_competitor_intelligence_generateCompetitorInsightSummary, lib_research_engine_generateFlashBrief, lib_research_engine_generateWeeklyBrief, lib_research_engine_generateMonthlyStrategy, lib_trend_engine_explainTrendScore, lib_trend_scanner_runTrendScan, lib_gemini_callGemini [EXTRACTED 1.00]
- **Egyptian Context Injected Into All AI Prompts** — lib_egyptian_context_EGYPTIAN_FASHION_SYSTEM_PROMPT, lib_egyptian_context_EGYPTIAN_CONSUMER_PROFILE, lib_egyptian_context_SEASONAL_CALENDAR_2026, lib_claude_generateMonthlyCampaigns, lib_claude_generateContent, lib_claude_analyzeSalesData, lib_claude_analyzeTrendRelevance, lib_competitor_intelligence_analyzeMarketGaps, lib_research_engine_generateFlashBrief, lib_trend_scanner_runTrendScan [EXTRACTED 0.95]
- **Shopify Data Flow: Real API → Mock Fallback → SalesData** — ext_shopify_api, lib_shopify_real_getRealSalesSummary, lib_shopify_getSalesData, lib_mock_data_mockSalesData, types_SalesData [EXTRACTED 1.00]
- **Trend Intelligence Pipeline: Scanner → Alerts → Engine** — lib_trend_scanner_runTrendScan, lib_trend_engine_RICH_TRENDS, lib_trend_alerts_calculatePriority, lib_trend_alerts_storeAlerts, lib_trend_alerts_alertStore, lib_trend_alerts_TrendScanResult [EXTRACTED 1.00]
- **Social Analytics APIs with Mock Fallbacks** — ext_meta_graph_api, ext_tiktok_api, lib_social_analytics_getInstagramAnalytics, lib_social_analytics_getFacebookAdsAnalytics, lib_social_analytics_getTikTokAnalytics, lib_social_analytics_buildSocialSummary [EXTRACTED 1.00]
- **UI Components Using lib/utils** — badge_Badge, score_ring_ScoreRing, stat_card_StatCard, lib_utils_cn, lib_utils_formatPercent [EXTRACTED 1.00]

## Communities (39 total, 13 thin omitted)

### Community 0 - "UI Utilities & Styling"
Cohesion: 0.08
Nodes (33): GET(), analyzeSalesData(), analyzeTrendRelevance(), generateContent(), generateMonthlyCampaigns(), getCurrentEgyptianSeason(), getSeasonalContext(), getSeasonRecommendations() (+25 more)

### Community 1 - "AI Engine (Groq/Gemini)"
Cohesion: 0.06
Nodes (45): Groq API (Llama 3.3 70B), Shopify Admin API, analyzeSalesData Function, analyzeTrendRelevance Function, generateContent Function, generateMonthlyCampaigns Function, Competitor Database (Tie House, British House, Massimo Dutti), Debackers Brand Profile (+37 more)

### Community 2 - "Egyptian Market Context"
Cohesion: 0.05
Nodes (43): dependencies, @anthropic-ai/sdk, autoprefixer, class-variance-authority, clsx, date-fns, framer-motion, lucide-react (+35 more)

### Community 3 - "TypeScript Config"
Cohesion: 0.12
Nodes (28): GET(), analyzeMarketGaps(), COMPETITOR_DATABASE, DEBACKERS_PROFILE, DetectedCampaign, generateCompetitorInsightSummary(), callGemini(), buildSalesSummary() (+20 more)

### Community 4 - "API Routes (POST)"
Cohesion: 0.09
Nodes (33): API: Campaigns Route (referenced), API: Competitors Route (referenced), API: Content Generate Route, API: Dashboard Route, API: Monthly Plan Route, API: Products Route, API: Sales Route, API: Trends Route (+25 more)

### Community 5 - "Badge & UI Components"
Cohesion: 0.14
Nodes (19): AlertCard(), PRIORITY_ICONS, PRIORITY_STYLES, STATUS_STYLES, TrendAlertsPage(), Badge Component, cn(), formatPercent Utility (+11 more)

### Community 6 - "Trend Intelligence"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "Campaign Generation"
Cohesion: 0.18
Nodes (11): DashboardData, DashboardPage(), SEASON_LABELS, formatCurrency(), formatNumber(), formatPercent(), CampaignCard(), SalesPage() (+3 more)

### Community 8 - "Sales & Shopify Data"
Cohesion: 0.12
Nodes (19): API: /api/campaigns, API: /api/campaigns/generate, API: /api/dashboard, Badge Component, PageHeader Component, ScoreRing Component, StatCard Component, Framer Motion (+11 more)

### Community 9 - "Agency Intelligence Reports"
Cohesion: 0.14
Nodes (14): CampaignCard(), CampaignsPage(), STATUS_STYLES, Product, ProductSuggestions(), ProductSuggestionsProps, getMonthName(), BUDGET_COLORS (+6 more)

### Community 10 - "Competitor Intelligence"
Cohesion: 0.20
Nodes (15): AlertPriority, AlertStatus, alertStore, calculatePriority(), getAlerts(), getLastScan(), storeAlerts(), TrendAlert (+7 more)

### Community 11 - "Pages & Navigation"
Cohesion: 0.18
Nodes (8): GET(), buildResearchContext(), generateFlashBrief(), generateMonthlyStrategy(), generateWeeklyBrief(), GET(), FlashBrief, GET()

### Community 12 - "Mock Data Layer"
Cohesion: 0.17
Nodes (8): CATEGORIES, CATEGORY_LABELS, COLOR_PALETTES, IMAGE_LIBRARY, ImageReference, Badge(), BadgeProps, variantStyles

### Community 13 - "Social Analytics"
Cohesion: 0.22
Nodes (11): API: /api/agency/flash, API: /api/agency/monthly, API: /api/agency/weekly, Research Engine Library, Agency Hub Page (/agency), Flash Brief Page (/agency/flash), Monthly Strategy Page (/agency/monthly), Weekly Report Page (/agency/weekly) (+3 more)

### Community 14 - "Content Generation"
Cohesion: 0.22
Nodes (6): AUDIENCE_SEGMENTS, CAMPAIGN_PERFORMANCE, PLATFORM_DATA, WEEKLY_TRAFFIC, PageHeader(), PageHeaderProps

### Community 15 - "Dashboard & Analytics"
Cohesion: 0.22
Nodes (8): CONTENT_TYPES, ContentDisplay(), LANGUAGES, PLATFORMS, safeStr(), TONES, ContentType, Language

### Community 16 - "Research Engine"
Cohesion: 0.38
Nodes (9): fetchShopify(), getRealAbandonedCarts(), getRealOrders(), getRealProducts(), getSalesData(), hasShopifyKeys(), processOrders(), shopifyHeaders() (+1 more)

### Community 17 - "Types & Interfaces"
Cohesion: 0.25
Nodes (6): cairo, inter, metadata, agencyItems, navItems, Sidebar()

### Community 18 - "Product Management"
Cohesion: 0.25
Nodes (6): CompetitorCard(), INSTAGRAM_LINKS, META_AD_LIBRARY_LINKS, THREAT_COLORS, TIKTOK_LINKS, CompetitorIntelligence

### Community 19 - "Auth & Config"
Cohesion: 0.40
Nodes (6): Meta Graph API v19, TikTok Open API v2, buildSocialSummary Function, getFacebookAdsAnalytics Function, getInstagramAnalytics Function, getTikTokAnalytics Function

### Community 20 - "Trend Alerts"
Cohesion: 0.70
Nodes (4): getRealOrders(), getRealProducts(), getRealSalesSummary(), shopifyFetch()

### Community 21 - "Monthly Plan"
Cohesion: 0.50
Nodes (4): getCurrentEgyptianSeason Function, getSeasonalContext Function, EgyptianSeason Type, SeasonalContext Type

### Community 23 - "Score & Stats UI"
Cohesion: 0.67
Nodes (3): External: Shopify API, External: Unsplash CDN, Next.js Config

### Community 24 - "Prisma & Database"
Cohesion: 0.67
Nodes (3): Root Layout, Sidebar Component, Tailwind Config

## Knowledge Gaps
- **179 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Egyptian Fashion System Prompt` connect `AI Engine (Groq/Gemini)` to `UI Utilities & Styling`, `Pages & Navigation`, `Competitor Intelligence`, `TypeScript Config`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `cn()` connect `Badge & UI Components` to `Campaign Generation`, `Agency Intelligence Reports`, `Mock Data Layer`, `Dashboard & Analytics`, `Types & Interfaces`, `Product Management`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Utilities & Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.0782312925170068 - nodes in this community are weakly interconnected._
- **Should `AI Engine (Groq/Gemini)` be split into smaller, more focused modules?**
  _Cohesion score 0.05858585858585859 - nodes in this community are weakly interconnected._
- **Should `Egyptian Market Context` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.11711711711711711 - nodes in this community are weakly interconnected._