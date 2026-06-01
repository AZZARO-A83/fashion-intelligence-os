import { NextResponse } from "next/server";
import { getSalesData } from "@/lib/shopify";
import { analyzeSalesData } from "@/lib/claude";

export async function GET() {
  try {
    // 🟢 Real Shopify data — falls back to mock if keys missing
    const salesData = await getSalesData();
    const isLive = !!(process.env.SHOPIFY_STORE_URL && process.env.SHOPIFY_ACCESS_TOKEN &&
      process.env.SHOPIFY_ACCESS_TOKEN !== "your_token_here");

    let insights = [];
    try {
      insights = await analyzeSalesData(salesData);
    } catch {
      // AI insights optional — return data without them
    }

    return NextResponse.json({
      ...salesData,
      insights,
      dataSource: isLive ? "live" : "mock",
      dataNote: isLive
        ? "🟢 LIVE — Real data from Shopify (last 30 days)"
        : "🔴 MOCK — Add SHOPIFY_STORE_URL + SHOPIFY_ACCESS_TOKEN to Vercel env vars to get real data",
    });
  } catch (err) {
    console.error("[Sales API] Error:", err);
    return NextResponse.json({ error: "Failed to load sales data" }, { status: 500 });
  }
}
