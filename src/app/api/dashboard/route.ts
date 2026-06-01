import { NextResponse } from "next/server";
import { mockDashboardStats, mockSalesData, mockTrends, mockCampaigns } from "@/lib/mock-data";
import { getSeasonalContext, getCurrentEgyptianSeason } from "@/lib/egyptian-context";

export async function GET() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const seasonalContext = getSeasonalContext(month, year);

  return NextResponse.json({
    stats: mockDashboardStats,
    seasonalContext,
    recentInsights: [
      "Linen shirt sales increased by 32% in the last 14 days — strongest performer this season.",
      "Women summer co-ord sets grew 41% faster than expected — increase inventory.",
      "Old Money Aesthetic trend score hit 88 — highest relevance to your catalog.",
      "Abandoned cart rate at 68% — SMS recovery could recapture EGP 45,000/month.",
      "Competitor activity increased 40% in summer content — act now to differentiate.",
    ],
    topTrends: mockTrends.slice(0, 3),
    activeCampaigns: mockCampaigns.filter((c) => c.status === "ACTIVE"),
    revenueByDay: mockSalesData.revenueByDay.slice(-7),
  });
}
