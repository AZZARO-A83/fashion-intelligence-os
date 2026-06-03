import { NextResponse } from "next/server";
import { generateWeeklyBrief } from "@/lib/research-engine";
import { setCachedReport, CACHE_KEYS } from "@/lib/cache";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const researchData = body.research ?? null;
    const brief = await generateWeeklyBrief(researchData);
    await setCachedReport(CACHE_KEYS.weekly, brief); // share with the whole team
    return NextResponse.json({ brief, status: "ai-research" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate weekly brief", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const brief = await generateWeeklyBrief(null);
    return NextResponse.json({ brief, status: "ai-research" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate weekly brief", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
