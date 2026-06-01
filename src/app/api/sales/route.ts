import { NextResponse } from "next/server";
import { getSalesData } from "@/lib/shopify";
import { analyzeSalesData } from "@/lib/claude";

export async function GET() {
  try {
    const salesData = await getSalesData();
    const { isLive, dataError } = salesData;

    let insights: string[] = [];
    try {
      insights = await analyzeSalesData(salesData);
    } catch {
      // AI insights optional
    }

    return NextResponse.json({
      ...salesData,
      insights,
      dataSource: isLive ? "live" : "mock",
      dataNote: isLive
        ? "🟢 LIVE — Real data from Shopify (last 30 days)"
        : `🔴 MOCK — ${dataError ?? "Showing placeholder data"}`,
    });
  } catch (err) {
    console.error("[Sales API] Error:", err);
    return NextResponse.json({ error: "Failed to load sales data" }, { status: 500 });
  }
}
