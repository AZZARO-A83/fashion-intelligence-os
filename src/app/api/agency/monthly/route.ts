import { NextResponse } from "next/server";
import { generateMonthlyStrategy } from "@/lib/research-engine";
import { setCachedReport, CACHE_KEYS } from "@/lib/cache";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const researchData = body.research ?? null;
    const strategy = await generateMonthlyStrategy(researchData);
    await setCachedReport(CACHE_KEYS.monthly, strategy); // share with the whole team
    return NextResponse.json({ strategy, status: "ai-research" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate monthly strategy", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const strategy = await generateMonthlyStrategy(null);
    return NextResponse.json({ strategy, status: "ai-research" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate monthly strategy", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
