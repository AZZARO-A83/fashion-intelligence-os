import { NextResponse } from "next/server";
import { generateContent } from "@/lib/claude";
import { ContentGenerationInput } from "@/types";

export async function POST(request: Request) {
  const body = (await request.json()) as ContentGenerationInput;

  if (!body.type || !body.platform || !body.topic) {
    return NextResponse.json(
      { error: "type, platform, and topic are required" },
      { status: 400 }
    );
  }

  try {
    const content = await generateContent(body);
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Content generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate content. Check GEMINI_API_KEY." },
      { status: 500 }
    );
  }
}
