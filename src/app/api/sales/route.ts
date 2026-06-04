import { NextResponse } from "next/server";
import { getSalesData } from "@/lib/shopify";
import { analyzeSalesData } from "@/lib/claude";
import { getCachedReport, setCachedReport, isFresh } from "@/lib/cache";

export const dynamic = "force-dynamic";

const SALES_TTL = 15 * 60;          // cache the heavy Shopify pull 15 min
const INSIGHTS_KEY = "sales:insights";
const INSIGHTS_TTL = 6 * 60 * 60;   // AI insights cached 6h

type SalesResult = Awaited<ReturnType<typeof getSalesData>>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const range = from && to ? { fromYmd: from, toYmd: to } : undefined;

  // 🟢 Live Shopify data — cached 15 min so the page doesn't re-fetch 150 days every load.
  const salesKey = `sales:data:${from ?? "def"}:${to ?? "def"}`;
  let salesData: SalesResult;
  const cachedSales = await getCachedReport<SalesResult>(salesKey);
  if (cachedSales && isFresh(cachedSales.generatedAt, SALES_TTL)) {
    salesData = cachedSales.data;
  } else {
    salesData = await getSalesData(range);
    if (salesData.isLive) await setCachedReport(salesKey, salesData, SALES_TTL);
  }

  // 🔵 AI insights — cached 6h (no Groq burn on every visit).
  let insights: string[] = [];
  const cachedIns = await getCachedReport<string[]>(INSIGHTS_KEY);
  if (cachedIns && isFresh(cachedIns.generatedAt, INSIGHTS_TTL)) {
    insights = cachedIns.data;
  } else {
    try {
      insights = await analyzeSalesData(salesData);
      await setCachedReport(INSIGHTS_KEY, insights, INSIGHTS_TTL);
    } catch {
      insights = cachedIns?.data ?? [];
    }
  }

  return NextResponse.json({ ...salesData, insights });
}
