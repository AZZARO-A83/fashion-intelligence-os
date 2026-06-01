import { NextResponse } from "next/server";
import { generateMonthlyStrategy } from "@/lib/research-engine";

export async function GET() {
  try {
    const strategy = await generateMonthlyStrategy();
    return NextResponse.json({ strategy, status: "ai-research" });
  } catch (err) {
    console.error("Monthly strategy error:", err);
    return NextResponse.json(
      { error: "Failed to generate monthly strategy", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
