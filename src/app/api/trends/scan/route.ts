import { NextResponse } from "next/server";
import { generateLiveAlerts } from "@/lib/live-research";
import { getCachedReport, setCachedReport, CACHE_KEYS } from "@/lib/cache";

export const maxDuration = 60;

// GET — return last live-generated alerts + sources (cached, no tokens).
export async function GET() {
  const cached = await getCachedReport<{ alerts: any[]; sources: any[] }>(CACHE_KEYS.alerts);
  const alerts = cached?.data?.alerts ?? [];
  return NextResponse.json({
    alerts,
    sources: cached?.data?.sources ?? [],
    generatedAt: cached?.generatedAt ?? null,
    newAlerts: alerts.filter((a) => a.status === "new").length,
    urgentAlerts: alerts.filter((a) => a.priority === "urgent").length,
    totalAlerts: alerts.length,
  });
}

// POST — run a live scan (Tavily + Groq), cache, return.
export async function POST() {
  try {
    const result = await generateLiveAlerts();
    await setCachedReport(CACHE_KEYS.alerts, result);
    return NextResponse.json({ ...result, generatedAt: new Date().toISOString(), success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Scan failed", details: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
