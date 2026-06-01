import { NextResponse } from "next/server";
import { mockTrends, mockCampaigns } from "@/lib/mock-data";
import { getSalesData } from "@/lib/shopify";
import { getSeasonalContext } from "@/lib/egyptian-context";
import { analyzeSalesData } from "@/lib/claude";

export async function GET() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const seasonalContext = getSeasonalContext(month, year);

  // 🟢 Real Shopify data
  const salesData = await getSalesData();
  const { isLive } = salesData;

  let insights: string[] = [];
  try {
    insights = await analyzeSalesData(salesData);
  } catch {
    insights = [
      "Connect GROQ_API_KEY to Vercel to enable AI insights.",
    ];
  }

  return NextResponse.json({
    stats: {
      totalRevenue: salesData.totalRevenue,
      revenueGrowth: salesData.weeklyGrowth,
      totalOrders: salesData.totalOrders,
      ordersGrowth: 8.4,
      avgOrderValue: salesData.avgOrderValue,
      aovGrowth: 4.1,
      activeCampaigns: mockCampaigns.filter((c) => c.status === "ACTIVE").length,
      topTrend: "Old Money Aesthetic",
      trendScore: 88,
    },
    isLive,
    seasonalContext,
    recentInsights: insights,
    topTrends: mockTrends.slice(0, 3),
    activeCampaigns: mockCampaigns.filter((c) => c.status === "ACTIVE"),
    revenueByDay: salesData.revenueByDay.slice(-7),
  });
}
