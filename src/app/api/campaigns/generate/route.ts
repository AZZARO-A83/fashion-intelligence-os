import { NextResponse } from "next/server";
import { generateMonthlyCampaigns } from "@/lib/claude";
import { getSalesData, buildSalesSummary } from "@/lib/shopify";
import { RICH_TRENDS, buildTrendsSummary } from "@/lib/trend-engine";
import { getSeasonalContext } from "@/lib/egyptian-context";
import { CampaignGenerationInput } from "@/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { month, year, focus } = body as { month: number; year: number; focus?: string };

  if (!month || !year) {
    return NextResponse.json({ error: "month and year are required" }, { status: 400 });
  }

  // 🟢 Real Shopify sales data
  const salesData = await getSalesData();
  const salesSummary = buildSalesSummary(salesData);
  const seasonalContext = getSeasonalContext(month, year);
  const trendsSummary = buildTrendsSummary();

  const competitorSummary = `
Research these Egyptian fashion competitors fresh and find their current gaps:
- Tie House (tiehouse.ae) — men only, mass market
- British House (britishhouse.shop) — premium men shirts only
- Massimo Dutti Egypt — international luxury, mall only
Find what they are NOT doing that Debackers can own.
`;

  const brandContext = `
DEBACKERS EGYPT — Premium casual, semi-casual, formal — Men AND Women
Belgian heritage since 1986 (40 years)
Current season: ${seasonalContext.current}
Seasonal focus: ${seasonalContext.recommendations.slice(0, 3).join("; ")}
Upcoming: ${seasonalContext.upcoming.map((u) => `${u.season} in ${u.daysAway} days`).join(", ")}
Data source: ${salesData.isLive ? "🟢 LIVE Shopify data" : "🔴 Mock data (Shopify not connected)"}
`;

  const input: CampaignGenerationInput = {
    month,
    year,
    brandContext,
    salesSummary,
    trendsSummary,
    competitorSummary,
    focus,
  };

  try {
    const campaigns = await generateMonthlyCampaigns(input);
    return NextResponse.json({
      campaigns,
      dataSource: salesData.isLive ? "live" : "mock",
    });
  } catch (error) {
    console.error("Campaign generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate campaigns. Check GROQ_API_KEY in Vercel env vars." },
      { status: 500 }
    );
  }
}
