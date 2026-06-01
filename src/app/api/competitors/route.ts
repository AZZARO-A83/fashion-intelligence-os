import { NextResponse } from "next/server";
import { COMPETITOR_DATABASE, DEBACKERS_PROFILE, analyzeMarketGaps } from "@/lib/competitor-intelligence";

export async function GET() {
  const marketGaps = await analyzeMarketGaps();

  return NextResponse.json({
    brand: DEBACKERS_PROFILE,
    competitors: COMPETITOR_DATABASE,
    marketGaps,
    lastUpdated: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({
    competitor: { id: `c-${Date.now()}`, ...body, snapshot: null },
  }, { status: 201 });
}
