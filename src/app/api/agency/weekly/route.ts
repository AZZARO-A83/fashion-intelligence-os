import { NextResponse } from "next/server";
import { generateWeeklyBrief } from "@/lib/research-engine";

export const maxDuration = 60;

export async function GET() {
  try {
    const brief = await generateWeeklyBrief();
    return NextResponse.json({ brief, status: "ai-research" });
  } catch (err) {
    console.error("Weekly brief error:", err);
    return NextResponse.json(
      { error: "Failed to generate weekly brief", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
