import { NextResponse } from "next/server";
import { getSalesData } from "@/lib/shopify";
import { getSeasonalContext } from "@/lib/egyptian-context";
import { analyzeSalesData } from "@/lib/claude";
import { getCachedReport, setCachedReport, isFresh } from "@/lib/cache";

const INSIGHTS_KEY = "dashboard:insights";
const INSIGHTS_TTL = 6 * 60 * 60; // 6 hours — matches Shopify data cache

export async function GET() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const seasonalContext = getSeasonalContext(month, year);

  // 🟢 Real Shopify data
  const salesData = await getSalesData();
  const { isLive } = salesData;

  // 🔵 AI insights — cached 6h so the home page doesn't burn Groq on every visit.
  let insights: string[] = [];
  const cached = await getCachedReport<string[]>(INSIGHTS_KEY);
  if (cached && isFresh(cached.generatedAt, INSIGHTS_TTL)) {
    insights = cached.data;
  } else {
    try {
      insights = await analyzeSalesData(salesData);
      await setCachedReport(INSIGHTS_KEY, insights, INSIGHTS_TTL);
    } catch {
      // Reuse the last good insights if generation is rate-limited; else honest note.
      insights = cached?.data ?? [
        "AI insights paused — daily limit reached. They refill automatically.",
      ];
    }
  }

  return NextResponse.json({
    stats: {
      totalRevenue: salesData.totalRevenue,
      revenueGrowth: salesData.weeklyGrowth,
      totalOrders: salesData.totalOrders,
      ordersGrowth: salesData.ordersGrowth ?? 0,   // 🟢 real, calculated from Shopify
      avgOrderValue: salesData.avgOrderValue,
      aovGrowth: salesData.aovGrowth ?? 0,          // 🟢 real, calculated from Shopify
      repeatPurchaseRate: salesData.repeatPurchaseRate,        // 🟢 live repeat-buyer %
      abandonedCarts: salesData.abandonedCarts,                // 🟢 live abandoned checkouts
      recoveryOpportunity: salesData.recoveryOpportunity ?? 0, // 🟢 live recoverable EGP
    },
    isLive,
    seasonalContext,
    recentInsights: insights,
    topProducts: salesData.topProducts.slice(0, 4), // 🟢 live Shopify bestsellers
    revenueByDay: salesData.revenueByDay.slice(-7),
  });
}
