import { NextResponse } from "next/server";
import { generateFlashBrief } from "@/lib/research-engine";

export async function GET() {
  try {
    const brief = await generateFlashBrief();
    return NextResponse.json({ brief, status: "ai-research" });
  } catch (err) {
    console.error("Flash brief error:", err);
    return NextResponse.json(
      { error: "Failed to generate flash brief", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
