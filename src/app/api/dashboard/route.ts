import { NextResponse } from "next/server";
import { getSalesData } from "@/lib/shopify";
import { getSeasonalContext } from "@/lib/egyptian-context";
import { analyzeSalesData } from "@/lib/claude";
import { getCachedReport, setCachedReport, isFresh } from "@/lib/cache";

// Always run fresh on the server — never serve a stale static snapshot.
// Sales numbers are pulled live each load; only AI insights are cached (below).
export const dynamic = "force-dynamic";

const INSIGHTS_KEY = "dashboard:insights";
const INSIGHTS_TTL = 6 * 60 * 60; // 6 hours — matches Shopify data cache

export async function GET(request: Request) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const seasonalContext = getSeasonalContext(month, year);

  // Optional date range from the picker (?from=YYYY-MM-DD&to=YYYY-MM-DD)
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const range = fromParam && toParam
    ? { from: new Date(fromParam + "T00:00:00Z"), to: new Date(toParam + "T23:59:59Z") }
    : undefined;
  const isDefaultRange = !range;

  // 🟢 Real Shopify data for the selected window
  const salesData = await getSalesData(range);
  const { isLive } = salesData;

  // 🔵 AI insights — only for the DEFAULT 30-day view, cached 6h. Custom ranges
  // reuse those cached insights (no extra Groq tokens when changing dates).
  let insights: string[] = [];
  const cached = await getCachedReport<string[]>(INSIGHTS_KEY);
  if (cached && isFresh(cached.generatedAt, INSIGHTS_TTL)) {
    insights = cached.data;
  } else if (isDefaultRange) {
    try {
      insights = await analyzeSalesData(salesData);
      await setCachedReport(INSIGHTS_KEY, insights, INSIGHTS_TTL);
    } catch {
      insights = cached?.data ?? [
        "AI insights paused — daily limit reached. They refill automatically.",
      ];
    }
  } else {
    insights = cached?.data ?? [];
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
    rangeFrom: salesData.rangeFrom,   // ISO start of the window shown
    rangeTo: salesData.rangeTo,       // ISO end of the window shown
    isDefaultRange,
    seasonalContext,
    recentInsights: insights,
    topProducts: salesData.topProducts.slice(0, 4), // 🟢 live Shopify bestsellers
    revenueByDay: salesData.revenueByDay.slice(-14),
  });
}
