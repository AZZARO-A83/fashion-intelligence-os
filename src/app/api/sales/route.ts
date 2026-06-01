import { NextResponse } from "next/server";
import { getShopifyReport } from "@/lib/shopify-analytics";
import { getSalesData } from "@/lib/shopify";
import { analyzeSalesData } from "@/lib/claude";

export async function GET() {
  try {
    // Try ShopifyQL report engine first — same data as your dashboard
    let salesData: any = await getShopifyReport();

    // Fall back to REST orders API if ShopifyQL fails
    if (!salesData) {
      console.log("[Sales API] ShopifyQL unavailable — falling back to REST orders");
      salesData = await getSalesData();
    }

    let insights: string[] = [];
    try {
      insights = await analyzeSalesData(salesData);
    } catch {
      // AI insights optional
    }

    return NextResponse.json({
      ...salesData,
      insights,
      dataSource: salesData.isLive ? "live" : "mock",
      dataNote: salesData.dataNote ?? (salesData.isLive
        ? "🟢 LIVE — Real data from Shopify (last 30 days)"
        : `🔴 MOCK — ${salesData.dataError ?? "Showing placeholder data"}`),
    });

  } catch (err) {
    console.error("[Sales API] Error:", err);
    return NextResponse.json({ error: "Failed to load sales data" }, { status: 500 });
  }
}
