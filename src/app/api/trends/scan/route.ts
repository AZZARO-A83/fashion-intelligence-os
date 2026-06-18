import { NextResponse } from "next/server";
import { generateLiveAlerts } from "@/lib/live-research";
import { getCachedReport, setCachedReport, CACHE_KEYS } from "@/lib/cache";
import type { RichTrend } from "@/lib/trend-engine";
import type { TrendAlert } from "@/lib/trend-alerts";

export const maxDuration = 60;

const ARABIC_TEXT = /[\u0600-\u06FF]/;

function alertsFromTrends(trends: RichTrend[]): TrendAlert[] {
  const now = new Date().toISOString();
  return trends
    .filter((t) => t.catalogMatch?.urgency === "act-now" || t.trendScore >= 82)
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 6)
    .map((t, i) => {
      const signals = [
        ...(t.arabicEvidence ?? []),
        ...(t.searchDemand ?? []),
        ...(t.signalsVerified ?? []),
      ].filter((v, index, arr) => v && arr.indexOf(v) === index).slice(0, 10);
      const arabicEvidence = signals.filter((s) => ARABIC_TEXT.test(s)).slice(0, 8);
      return {
        id: `trend-${t.id}`,
        detectedAt: now,
        trendName: t.name,
        arabicName: t.arabicName,
        platform: "google",
        category: t.category,
        currentScore: t.trendScore,
        previousScore: Math.max(0, t.trendScore - 12),
        scoreChange: 12,
        growthRate: t.searchSignalCount ?? t.trendScore,
        priority: i < 3 || t.trendScore >= 85 ? "urgent" : "high",
        status: "new",
        source: "cached trend engine - Arabic weighted search demand",
        signals,
        arabicEvidence,
        relevanceToDebackers: `${t.catalogCategory || "Debackers catalog"} - relevance ${t.relevanceScore}/100, confidence ${t.confidenceScore}%.`,
        suggestedAction: t.recommendedAction || "campaign push",
        hook: t.contentPrescription?.hook,
        hashtags: t.contentPrescription?.hashtags,
        peakDaysEstimate: 7,
        isNew: true,
      } satisfies TrendAlert;
    });
}

// GET — return last live-generated alerts + sources (cached, no tokens).
export async function GET() {
  const [cached, trendCache] = await Promise.all([
    getCachedReport<{ alerts: TrendAlert[]; sources: any[] }>(CACHE_KEYS.alerts),
    getCachedReport<{ trends: RichTrend[]; sources: any[] }>(CACHE_KEYS.trends),
  ]);
  const cachedAlerts = cached?.data?.alerts ?? [];
  const fallbackAlerts = cachedAlerts.length ? [] : alertsFromTrends(trendCache?.data?.trends ?? []);
  const alerts = cachedAlerts.length ? cachedAlerts : fallbackAlerts;
  return NextResponse.json({
    alerts,
    sources: cached?.data?.sources ?? trendCache?.data?.sources ?? [],
    generatedAt: cached?.generatedAt ?? trendCache?.generatedAt ?? null,
    newAlerts: alerts.filter((a) => a.status === "new").length,
    urgentAlerts: alerts.filter((a) => a.priority === "urgent").length,
    totalAlerts: alerts.length,
    fallbackFromTrends: cachedAlerts.length === 0 && fallbackAlerts.length > 0,
  });
}

// POST — run a live scan (Tavily + Groq), cache, return.
export async function POST() {
  try {
    const [result, trendCache] = await Promise.all([
      generateLiveAlerts(),
      getCachedReport<{ trends: RichTrend[] }>(CACHE_KEYS.trends),
    ]);
    if (!result.alerts.length) {
      result.alerts = alertsFromTrends(trendCache?.data?.trends ?? []);
    }
    await setCachedReport(CACHE_KEYS.alerts, result);
    return NextResponse.json({ ...result, generatedAt: new Date().toISOString(), success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Scan failed", details: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
