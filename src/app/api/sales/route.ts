import { NextResponse } from "next/server";
import { mockSalesData } from "@/lib/mock-data";
import { analyzeSalesData } from "@/lib/claude";

export async function GET() {
  // In production: fetch from Shopify API and process
  // For MVP: use mock data enriched with AI insights
  try {
    const insights = await analyzeSalesData(mockSalesData);
    return NextResponse.json({ ...mockSalesData, insights });
  } catch {
    // Return mock data without AI insights if Claude API not configured
    return NextResponse.json({
      ...mockSalesData,
      insights: [
        { metric: "Top Product", value: "Linen Summer Shirt", change: 32, trend: "up", explanation: "Linen shirt sales increased by 32% in the last 14 days — strongest summer signal." },
        { metric: "Co-ord Sets", value: "Summer Co-ord Set", change: 41, trend: "up", explanation: "Women summer co-ord sets growing 41% faster than forecast — increase restock." },
        { metric: "Abandoned Carts", value: "847 carts", change: -5, trend: "down", explanation: "847 abandoned carts this month — SMS recovery could recapture EGP 45,000." },
        { metric: "Repeat Purchase", value: "28%", change: 3.2, trend: "up", explanation: "Repeat purchase rate at 28% — above category average. Loyalty program opportunity." },
        { metric: "Slow Movers", value: "Winter Wool Coat", change: -45, trend: "down", explanation: "Winter Wool Coat down 45% — expected seasonal decline, consider markdowns." },
      ],
    });
  }
}
