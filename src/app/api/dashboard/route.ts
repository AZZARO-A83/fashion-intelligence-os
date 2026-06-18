import { NextResponse } from "next/server";
import { getSalesData } from "@/lib/shopify";
import { getSeasonalContext } from "@/lib/egyptian-context";
import { analyzeSalesData } from "@/lib/claude";
import { getCachedReport, setCachedReport, isFresh } from "@/lib/cache";

// Always run fresh on the server — never serve a stale static snapshot.
// Sales numbers are pulled live each load; only AI insights are cached (below).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // the heavy Shopify pull needs more than the 10s default

const INSIGHTS_KEY = "dashboard:insights";
const INSIGHTS_TTL = 6 * 60 * 60; // 6 hours
const SALES_TTL = 15 * 60;        // 15 min — the heavy Shopify pull is cached this long

type SalesResult = Awaited<ReturnType<typeof getSalesData>>;

function buildLiveSalesInsights(salesData: SalesResult): string[] {
  const topRevenue = salesData.topProducts[0];
  const topUnits = salesData.topByUnits?.[0];
  const categories = Array.from(new Set(salesData.topProducts.map((p) => p.category))).slice(0, 4);
  const insights: string[] = [];

  if (topRevenue) {
    insights.push(
      `Revenue leader: ${topRevenue.name} made EGP ${topRevenue.revenue.toLocaleString("en-EG")} from ${topRevenue.units} units. Use it as the hero product for paid ads and homepage placement.`
    );
  }

  if (topUnits && topUnits.family !== topRevenue?.family) {
    insights.push(
      `Volume leader: ${topUnits.name} sold ${topUnits.units} units. Build bundles or cross-sells around it because it has stronger buyer frequency than revenue-only ranking shows.`
    );
  }

  if (salesData.avgOrderValue > 0) {
    insights.push(
      `AOV is EGP ${salesData.avgOrderValue.toLocaleString("en-EG")}. Push add-ons near EGP 800-2,500 to lift cart value without making the offer feel too heavy.`
    );
  }

  if (salesData.recoveryOpportunity && salesData.recoveryOpportunity > 0) {
    insights.push(
      `Cart recovery opportunity is EGP ${salesData.recoveryOpportunity.toLocaleString("en-EG")}. Prioritize WhatsApp/SMS reminders for abandoned carts before spending more on cold traffic.`
    );
  }

  if (categories.length) {
    insights.push(
      `Bestseller spread now covers ${categories.join(", ")}. Keep the sales view category-diverse so the team does not over-buy one color or one repeated style.`
    );
  }

  return insights.slice(0, 5);
}

export async function GET(request: Request) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const seasonalContext = getSeasonalContext(month, year);

  // Optional date range from the picker (?from=YYYY-MM-DD&to=YYYY-MM-DD)
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const range = fromParam && toParam ? { fromYmd: fromParam, toYmd: toParam } : undefined;
  const isDefaultRange = !range;

  // 🟢 Real Shopify data for the selected window — cached 15 min so the heavy
  // 120-day fetch (needed for exact returns) doesn't run on every page load.
  const salesKey = `sales:${fromParam ?? "def"}:${toParam ?? "def"}`;
  let salesData: SalesResult;
  const cachedSales = await getCachedReport<SalesResult>(salesKey);
  if (cachedSales && isFresh(cachedSales.generatedAt, SALES_TTL)) {
    salesData = cachedSales.data;
  } else {
    salesData = await getSalesData(range);
    if (salesData.isLive) await setCachedReport(salesKey, salesData, SALES_TTL);
  }
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

  const liveInsights = buildLiveSalesInsights(salesData);

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
    dataError: salesData.dataError ?? null, // honest error if the live pull failed
    rangeFrom: salesData.rangeFrom,   // ISO start of the window shown
    rangeTo: salesData.rangeTo,       // ISO end of the window shown
    isDefaultRange,
    seasonalContext,
    recentInsights: [...liveInsights, ...insights].slice(0, 5),
    topProducts: salesData.topProducts.slice(0, 5),
    revenueByDay: salesData.revenueByDay.slice(-14),
  });
}
