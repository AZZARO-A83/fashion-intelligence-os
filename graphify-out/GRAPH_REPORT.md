# Graph Report - C:/Users/User/fashion-intelligence-os  (2026-06-02)

## Corpus Check
- Corpus is ~35,731 words - fits in a single context window. You may not need a graph.

## Summary
- 350 nodes · 695 edges · 21 communities (15 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Trend Alerts UI|Trend Alerts UI]]
- [[_COMMUNITY_AI Competitors & Content Engine|AI Competitors & Content Engine]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Campaigns & Content Pages|Campaigns & Content Pages]]
- [[_COMMUNITY_Agency Intelligence  Flash Brief|Agency Intelligence / Flash Brief]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Dashboard & Sales Analytics|Dashboard & Sales Analytics]]
- [[_COMMUNITY_Trend Alerts Logic|Trend Alerts Logic]]
- [[_COMMUNITY_Social Media Analytics|Social Media Analytics]]
- [[_COMMUNITY_Analytics Page|Analytics Page]]
- [[_COMMUNITY_App Layout & Navigation|App Layout & Navigation]]
- [[_COMMUNITY_Inspiration Library|Inspiration Library]]
- [[_COMMUNITY_Shopify Live API|Shopify Live API]]
- [[_COMMUNITY_Agency Hub|Agency Hub]]
- [[_COMMUNITY_Products API|Products API]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Products Data|Products Data]]
- [[_COMMUNITY_Prisma Database|Prisma Database]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 25 edges
2. `callGemini()` - 17 edges
3. `compilerOptions` - 16 edges
4. `getSalesData()` - 14 edges
5. `POST()` - 12 edges
6. `Badge()` - 12 edges
7. `PageHeader()` - 11 edges
8. `generateFlashBrief()` - 11 edges
9. `generateMonthlyStrategy()` - 11 edges
10. `formatNumber()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `DashboardPage()` --calls--> `formatNumber()`  [EXTRACTED]
  src/app/page.tsx → src/lib/utils.ts
- `POST()` --calls--> `generateFlashBrief()`  [EXTRACTED]
  src/app/api/agency/flash/route.ts → src/lib/research-engine.ts
- `GET()` --calls--> `generateFlashBrief()`  [EXTRACTED]
  src/app/api/agency/flash/route.ts → src/lib/research-engine.ts
- `POST()` --calls--> `generateMonthlyStrategy()`  [EXTRACTED]
  src/app/api/agency/monthly/route.ts → src/lib/research-engine.ts
- `GET()` --calls--> `generateMonthlyStrategy()`  [EXTRACTED]
  src/app/api/agency/monthly/route.ts → src/lib/research-engine.ts

## Communities (21 total, 6 thin omitted)

### Community 0 - "Trend Alerts UI"
Cohesion: 0.07
Nodes (50): AlertCard(), PRIORITY_ICONS, PRIORITY_STYLES, STATUS_STYLES, TrendAlertsPage(), DashboardData, DashboardPage(), SEASON_LABELS (+42 more)

### Community 1 - "AI Competitors & Content Engine"
Cohesion: 0.11
Nodes (31): GET(), analyzeTrendRelevance(), generateContent(), generateMonthlyCampaigns(), analyzeMarketGaps(), COMPETITOR_DATABASE, DEBACKERS_PROFILE, DetectedCampaign (+23 more)

### Community 2 - "Package Dependencies"
Cohesion: 0.05
Nodes (43): dependencies, @anthropic-ai/sdk, autoprefixer, class-variance-authority, clsx, date-fns, framer-motion, lucide-react (+35 more)

### Community 3 - "Campaigns & Content Pages"
Cohesion: 0.06
Nodes (26): CONTENT_TYPES, ContentDisplay(), LANGUAGES, PLATFORMS, safeStr(), TONES, mockCampaigns, mockCompetitors (+18 more)

### Community 4 - "Agency Intelligence / Flash Brief"
Cohesion: 0.19
Nodes (24): GET(), POST(), callClaude(), buildDynamicCalendar(), buildSystemPrompt(), buildResearchContext(), generateFlashBrief(), generateMonthlyStrategy() (+16 more)

### Community 5 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 6 - "Dashboard & Sales Analytics"
Cohesion: 0.22
Nodes (15): GET(), analyzeSalesData(), mockTrends, getShopifyReport(), parseTable(), shopifyGraphQL(), fetchShopify(), getRealAbandonedCarts() (+7 more)

### Community 7 - "Trend Alerts Logic"
Cohesion: 0.20
Nodes (15): AlertPriority, AlertStatus, alertStore, calculatePriority(), getAlerts(), getLastScan(), storeAlerts(), TrendAlert (+7 more)

### Community 8 - "Social Media Analytics"
Cohesion: 0.26
Nodes (12): FacebookAdsAnalytics, fetchMeta(), getFacebookAdsAnalytics(), getInstagramAnalytics(), getMockFacebookAdsData(), getMockInstagramData(), getMockTikTokData(), getTikTokAnalytics() (+4 more)

### Community 9 - "Analytics Page"
Cohesion: 0.25
Nodes (5): AnalyticsPage(), AUDIENCE_SEGMENTS, buildWeeklyPattern(), PLATFORM_DATA, SalesData

### Community 10 - "App Layout & Navigation"
Cohesion: 0.25
Nodes (6): cairo, inter, metadata, agencyItems, navItems, Sidebar()

### Community 11 - "Inspiration Library"
Cohesion: 0.22
Nodes (5): CATEGORIES, CATEGORY_LABELS, COLOR_PALETTES, IMAGE_LIBRARY, ImageReference

### Community 12 - "Shopify Live API"
Cohesion: 0.70
Nodes (4): getRealOrders(), getRealProducts(), getRealSalesSummary(), shopifyFetch()

## Knowledge Gaps
- **122 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Trend Alerts UI` to `Inspiration Library`, `App Layout & Navigation`, `Campaigns & Content Pages`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `callGemini()` connect `AI Competitors & Content Engine` to `Agency Intelligence / Flash Brief`, `Dashboard & Sales Analytics`, `Trend Alerts Logic`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Badge()` connect `Trend Alerts UI` to `Inspiration Library`, `Analytics Page`, `Campaigns & Content Pages`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Trend Alerts UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06720321931589537 - nodes in this community are weakly interconnected._
- **Should `AI Competitors & Content Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.10676532769556026 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._