import { NextResponse } from "next/server";
import { mockCampaigns } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  let campaigns = mockCampaigns;

  if (month && year) {
    campaigns = mockCampaigns.filter(
      (c) => c.month === parseInt(month) && c.year === parseInt(year)
    );
  }

  return NextResponse.json({ campaigns });
}
