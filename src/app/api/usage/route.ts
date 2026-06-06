import { NextResponse } from "next/server";
import { getGroqUsedToday, GROQ_DAILY_LIMIT, getSerperUsedThisMonth, SERPER_MONTHLY_LIMIT } from "@/lib/cache";

export const dynamic = "force-dynamic";

const AVG_PER_GENERATION = 9000;

export async function GET() {
  const [groqUsed, serperUsed] = await Promise.all([
    getGroqUsedToday(),
    getSerperUsedThisMonth(),
  ]);

  const groqRemaining = Math.max(0, GROQ_DAILY_LIMIT - groqUsed);
  const serperRemaining = Math.max(0, SERPER_MONTHLY_LIMIT - serperUsed);

  return NextResponse.json({
    // Groq AI budget (daily)
    used: groqUsed,
    limit: GROQ_DAILY_LIMIT,
    remaining: groqRemaining,
    percentUsed: Math.min(100, Math.round((groqUsed / GROQ_DAILY_LIMIT) * 100)),
    estGenerationsLeft: Math.floor(groqRemaining / AVG_PER_GENERATION),
    // Serper search credits (monthly)
    serper: {
      used: serperUsed,
      limit: SERPER_MONTHLY_LIMIT,
      remaining: serperRemaining,
      percentUsed: Math.min(100, Math.round((serperUsed / SERPER_MONTHLY_LIMIT) * 100)),
    },
  });
}
