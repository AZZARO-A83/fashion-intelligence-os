import { NextResponse } from "next/server";
import { generateMonthlyCampaigns } from "@/lib/claude";
import { mockSalesData, mockTrends, mockCompetitors } from "@/lib/mock-data";
import { getSeasonalContext } from "@/lib/egyptian-context";
import { CampaignGenerationInput } from "@/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { month, year, focus } = body as { month: number; year: number; focus?: string };

  if (!month || !year) {
    return NextResponse.json({ error: "month and year are required" }, { status: 400 });
  }

  const seasonalContext = getSeasonalContext(month, year);

  const salesSummary = `
Total Revenue: EGP ${mockSalesData.totalRevenue.toLocaleString()}
Total Orders: ${mockSalesData.totalOrders}
Avg Order Value: EGP ${mockSalesData.avgOrderValue}
Weekly Growth: ${mockSalesData.weeklyGrowth}%
Abandoned Carts: ${mockSalesData.abandonedCarts}
Top Products: ${mockSalesData.topProducts.map((p) => `${p.name} (${p.growth > 0 ? "+" : ""}${p.growth}%)`).join(", ")}
Low Performers: ${mockSalesData.lowProducts.map((p) => `${p.name} (${p.growth}%)`).join(", ")}
`;

  const trendsSummary = mockTrends
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 5)
    .map((t) => `${t.name} (${t.platform}): score ${t.trendScore}, growth ${t.growthRate}%, peaks in ${t.expectedPeakDays} days`)
    .join("\n");

  const competitorSummary = mockCompetitors
    .map((c) => `${c.name}: ${c.snapshot?.insights.join(" | ")}`)
    .join("\n");

  const brandContext = `
Egyptian fashion brand targeting men and women 18-45.
Current season: ${seasonalContext.current}
Seasonal recommendations: ${seasonalContext.recommendations.slice(0, 3).join("; ")}
Upcoming: ${seasonalContext.upcoming.map((u) => `${u.season} in ${u.daysAway} days`).join(", ")}
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
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Campaign generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate campaigns. Check GEMINI_API_KEY." },
      { status: 500 }
    );
  }
}
