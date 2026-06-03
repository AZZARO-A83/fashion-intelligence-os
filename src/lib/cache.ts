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
} as const;
