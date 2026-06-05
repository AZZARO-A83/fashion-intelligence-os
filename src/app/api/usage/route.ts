import { NextResponse } from "next/server";
import { getGroqUsedToday, GROQ_DAILY_LIMIT } from "@/lib/cache";

export const dynamic = "force-dynamic";

// ~ average tokens a single generation spends (reports run higher, content lower)
const AVG_PER_GENERATION = 9000;

// Returns today's AI budget so the UI can show "X% used · ~N generations left".
export async function GET() {
  const used = await getGroqUsedToday();
  const remaining = Math.max(0, GROQ_DAILY_LIMIT - used);
  return NextResponse.json({
    used,
    limit: GROQ_DAILY_LIMIT,
    remaining,
    percentUsed: Math.min(100, Math.round((used / GROQ_DAILY_LIMIT) * 100)),
    estGenerationsLeft: Math.floor(remaining / AVG_PER_GENERATION),
  });
}
