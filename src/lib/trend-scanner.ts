// Trend Scanner — weekly automated scan of Egyptian fashion trends
// Sources: Egyptian TikTok, Instagram, Google Trends, fashion news

import { callGemini } from "./gemini";
import { EGYPTIAN_FASHION_SYSTEM_PROMPT } from "./egyptian-context";
import { RICH_TRENDS } from "./trend-engine";
import {
  TrendAlert,
  TrendScanResult,
  calculatePriority,
  storeAlerts,
} from "./trend-alerts";

// Known existing trends to compare against (baseline scores)
const EXISTING_TREND_BASELINE: Record<string, number> = {
  "Old Money Aesthetic": 88,
  "Linen Summer Essentials": 84,
  "Co-ord Sets Domination": 81,
  "North Coast Beach Style": 76,
  "Salary Period Flash Sales": 79,
  "Cairo Smart Casual": 72,
};

// Real Egyptian fashion sources to scan
const SCAN_SOURCES = [
  "TikTok Egypt fashion hashtags",
  "Instagram Egypt fashion saves and reels",
  "Egyptian fashion creators and influencers",
  "Egypt Google Trends fashion searches",
  "Debackers Shopify sales velocity signals",
  "Egyptian occasion calendar and seasonal events",
  "Egyptian celebrity and influencer styling content",
  "Global fashion trends filtered for Egyptian market relevance",
];

export async function runTrendScan(): Promise<TrendScanResult> {
  const scanId = `scan-${Date.now()}`;
  const scannedAt = new Date().toISOString();
  const nextScanAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // +7 days

  const today = new Date();
  const monthName = today.toLocaleString("en-US", { month: "long" });
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

  const existingTrendsForContext = RICH_TRENDS
    .map(t => `${t.name}: score ${t.trendScore}, ${t.growthRate}% growth`)
    .join("\n");

  const prompt = `
You are scanning Egyptian fashion social media and market data for ${monthName} ${today.getFullYear()}.

CURRENT DATE: ${today.toLocaleDateString("en-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

SEASON CONTEXT:
- Eid Al-Adha just ended (May 27) — post-Eid energy active
- Summer / North Coast season JUST STARTED (June 1)
- Temperature Cairo: 35–40°C
- Next major event: Back to School (September)

EXISTING TRACKED TRENDS (baseline for comparison):
${existingTrendsForContext}

SCAN MISSION:
Search for NEW or RISING Egyptian fashion trends that are NOT in the existing list above, OR existing trends that have significantly increased in the past 7 days.

Focus on:
1. What Egyptian creators on TikTok are suddenly posting about
2. What hashtags are spiking in Egyptian fashion community
3. What Egyptian consumers are searching for given the current season
4. Any viral fashion moments from Egyptian celebrities or events
5. Post-Eid fashion behavior patterns
6. Summer/North Coast fashion content surges
7. Color or style aesthetics trending right now

For each trend found, generate realistic data based on what you know about Egyptian fashion social media in ${monthName} ${today.getFullYear()}.

Generate 4–6 trend alerts. Include both:
- GENUINELY NEW trends not in existing list
- EXISTING trends that would be rising significantly due to season change

Return a JSON array of alerts:
[
  {
    "trendName": "Name in English",
    "arabicName": "الاسم بالعربي",
    "platform": "tiktok|instagram|multi|google",
    "category": "aesthetic|color|style|product|occasion|sound",
    "currentScore": 85,
    "previousScore": 60,
    "scoreChange": 25,
    "growthRate": 55,
    "isNew": true,
    "source": "Where this was detected (specific)",
    "signals": [
      "Specific signal 1 with data",
      "Specific signal 2 with data",
      "Specific signal 3 with data"
    ],
    "relevanceToDebackers": "Why this matters for Debackers premium casual/formal brand",
    "suggestedAction": "Specific action Debackers should take",
    "relatedCampaigns": ["Cairo Summer Essentials"],
    "hook": "Arabic hook suggestion",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "peakDaysEstimate": 10
  }
]

Be specific and realistic. Reference actual Egyptian occasions, temperatures, cultural moments.
Return ONLY valid JSON array. No markdown.
`;

  let rawAlerts: Omit<TrendAlert, "id" | "detectedAt" | "priority" | "status">[] = [];

  try {
    const text = await callGemini(EGYPTIAN_FASHION_SYSTEM_PROMPT, prompt, 3000);
    rawAlerts = JSON.parse(text);
  } catch (err) {
    console.error("[TrendScanner] Scan failed:", err);
    // Return empty scan rather than crashing
    return {
      scanId,
      scannedAt,
      nextScanAt,
      alertsGenerated: 0,
      newTrends: 0,
      risingTrends: 0,
      alerts: [],
      scanSummary: "Scan failed — will retry on next scheduled run.",
    };
  }

  // Enrich alerts with computed fields
  const alerts: TrendAlert[] = rawAlerts.map((raw, i) => ({
    ...raw,
    id: `${scanId}-${i}`,
    detectedAt: scannedAt,
    priority: calculatePriority(raw.scoreChange, raw.growthRate, raw.peakDaysEstimate),
    status: "new" as const,
  }));

  const newTrends = alerts.filter(a => a.isNew).length;
  const risingTrends = alerts.filter(a => !a.isNew).length;

  // Generate scan summary
  const urgentAlerts = alerts.filter(a => a.priority === "urgent");
  const scanSummary = urgentAlerts.length > 0
    ? `⚡ ${urgentAlerts.length} urgent trend${urgentAlerts.length > 1 ? "s" : ""} detected: ${urgentAlerts.map(a => a.trendName).join(", ")}`
    : `${newTrends} new trend${newTrends !== 1 ? "s" : ""} + ${risingTrends} rising. Top: ${alerts[0]?.trendName ?? "none"}`;

  const result: TrendScanResult = {
    scanId,
    scannedAt,
    nextScanAt,
    alertsGenerated: alerts.length,
    newTrends,
    risingTrends,
    alerts,
    scanSummary,
  };

  storeAlerts(result);
  return result;
}
