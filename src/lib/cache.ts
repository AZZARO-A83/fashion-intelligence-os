// ─── Shared Report Cache (Upstash Redis on Vercel) ───────────────────
// Generate-once, store, share. The first person to generate a report saves it
// here; everyone else (the whole team, via the shared link) reads the SAME
// stored copy — instantly, with ZERO AI tokens. Regenerate overwrites it.
//
// This is what keeps the tool inside the free Groq daily budget: tokens are
// spent only when someone deliberately regenerates, NOT on every page view.

import { Redis } from "@upstash/redis";

// Vercel's Upstash integration injects one of two naming styles — support both,
// so this works no matter which the dashboard wired up.
const url =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// If the store isn't configured, caching is gracefully disabled — the app
// still works, it just generates live every time (old behaviour). No crashes.
const redis = url && token ? new Redis({ url, token }) : null;

export const cacheEnabled = !!redis;

export interface CachedReport<T = unknown> {
  data: T;
  generatedAt: string; // ISO timestamp of when it was generated
}

// Read a stored report. Returns null if nothing cached yet (or cache off).
export async function getCachedReport<T = unknown>(
  key: string
): Promise<CachedReport<T> | null> {
  if (!redis) return null;
  try {
    const cached = await redis.get<CachedReport<T>>(key);
    return cached ?? null;
  } catch (err) {
    console.error("[cache] read failed:", err);
    return null; // never let a cache miss break the page
  }
}

// Save a freshly generated report so the whole team can read it.
// Optional ttlSeconds auto-expires it (e.g. dashboard insights every 6h).
export async function setCachedReport<T = unknown>(
  key: string,
  data: T,
  ttlSeconds?: number
): Promise<void> {
  if (!redis) return;
  try {
    const payload: CachedReport<T> = {
      data,
      generatedAt: new Date().toISOString(),
    };
    if (ttlSeconds) await redis.set(key, payload, { ex: ttlSeconds });
    else await redis.set(key, payload);
  } catch (err) {
    console.error("[cache] write failed:", err);
    // swallow — a failed cache write must never block returning the report
  }
}

// True if an ISO timestamp is within the last `maxAgeSeconds`.
export function isFresh(iso: string | null | undefined, maxAgeSeconds: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < maxAgeSeconds * 1000;
}

// ─── Groq daily token budget tracking ────────────────────────────────
// We count the tokens every generation actually spends, so the app can show
// "X% of today's free budget used · ~N generations left" — no more guessing.
export const GROQ_DAILY_LIMIT = 100_000; // free tier: 100k tokens/day

function egyptDay(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export async function recordGroqUsage(tokens: number): Promise<void> {
  if (!redis || !tokens || tokens < 0) return;
  try {
    const key = `groq:usage:${egyptDay()}`;
    await redis.incrby(key, Math.round(tokens));
    await redis.expire(key, 30 * 60 * 60); // 30h — covers the daily window
  } catch {
    /* never block a generation over usage tracking */
  }
}

export async function getGroqUsedToday(): Promise<number> {
  if (!redis) return 0;
  try {
    return (await redis.get<number>(`groq:usage:${egyptDay()}`)) ?? 0;
  } catch {
    return 0;
  }
}

// ─── Serper monthly search credit tracking ───────────────────────────
// Free tier = 2,500 searches/month. We count every call so the UI can
// show "X searches used · Y remaining this month".
export const SERPER_MONTHLY_LIMIT = 2_500;

function egyptMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit",
  }).format(new Date()); // "YYYY-MM"
}

export async function recordSerperUsage(calls: number = 1): Promise<void> {
  if (!redis || calls <= 0) return;
  try {
    const key = `serper:usage:${egyptMonth()}`;
    await redis.incrby(key, calls);
    await redis.expire(key, 35 * 24 * 60 * 60); // 35 days covers the month
  } catch {
    /* never block a search over usage tracking */
  }
}

export async function getSerperUsedThisMonth(): Promise<number> {
  if (!redis) return 0;
  try {
    return (await redis.get<number>(`serper:usage:${egyptMonth()}`)) ?? 0;
  } catch {
    return 0;
  }
}

// Stable keys for each shareable report type.
export const CACHE_KEYS = {
  flash: "report:flash:latest",
  weekly: "report:weekly:latest",
  monthly: "report:monthly:latest",
  monthlyPlan: "report:monthly-plan:latest",
  trends: "live:trends:latest",
  competitors: "live:competitors:latest",
  campaigns: "live:campaigns:latest",
  alerts: "live:alerts:latest",
  inspiration: "live:inspiration:latest",
  searchDemand: "live:search-demand:latest",
} as const;
