// ─── Step 2: Flash Brief Generation ──────────────────────────────────
// Accepts pre-fetched research data from Step 1
// Fast: ~20-30 seconds — no web searches here, AI generation only

import { NextResponse } from "next/server";
import { generateFlashBrief } from "@/lib/research-engine";
import { setCachedReport, CACHE_KEYS } from "@/lib/cache";

export const maxDuration = 60;

// POST — accepts research from Step 1
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const researchData = body.research ?? null;

    const brief = await generateFlashBrief(researchData);
    await setCachedReport(CACHE_KEYS.flash, brief); // share with the whole team
    return NextResponse.json({ brief, status: "ai-research" });

  } catch (err) {
    console.error("Flash brief error:", err);
    return NextResponse.json(
      { error: "Failed to generate flash brief", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET fallback — does everything in one call (slower, may timeout)
export async function GET() {
  try {
    const brief = await generateFlashBrief(null);
    return NextResponse.json({ brief, status: "ai-research" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate flash brief", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
