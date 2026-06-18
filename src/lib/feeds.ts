// ─── Trusted Publisher Feeds (RSS/Atom) — the "publisher-direct" layer ──
// Second leg of the source system, next to Serper (Google results):
// the magazines' OWN newest-articles wires. Free, unlimited, key-less,
// dated, and as authentic as it gets — the publisher itself is the source.
// All feeds below were probed and confirmed live (June 2026).
//
// Append-only by design: collectSources() merges these AFTER Serper results.
// Every function fails soft — a dead feed can never break a generation.

import { getCachedReport, setCachedReport } from "./cache";
import type { Source } from "./tavily";

interface FeedDef {
  url: string;
  host: string;
  tier: 1 | 2 | 3; // 1 = trade/forward (fabrics+colours), 2 = global authority, 3 = style/regional
}

// Top-authority only — curated, not everything with a feed.
const FEEDS: FeedDef[] = [
  // Tier 1 — trade press: where new fabrics/colours/collections surface FIRST
  { url: "https://www.businessoffashion.com/feed", host: "businessoffashion.com", tier: 1 },
  { url: "https://wwd.com/feed", host: "wwd.com", tier: 1 },
  { url: "https://www.just-style.com/feed", host: "just-style.com", tier: 1 },
  // Tier 2 — global authority, men + women
  { url: "https://www.vogue.com/feed/rss", host: "vogue.com", tier: 2 },
  { url: "https://www.gq.com/feed/rss", host: "gq.com", tier: 2 },
  { url: "https://www.glamour.com/feed/rss", host: "glamour.com", tier: 2 },
  { url: "https://www.harpersbazaar.com/rss/all.xml", host: "harpersbazaar.com", tier: 2 },
  { url: "https://www.elle.com/rss/all.xml", host: "elle.com", tier: 2 },
  { url: "https://www.esquire.com/rss/all.xml", host: "esquire.com", tier: 2 },
  // Tier 3 — Arabia/Egypt + sharp style outlets
  { url: "https://www.harpersbazaararabia.com/feed", host: "harpersbazaararabia.com", tier: 3 },
  { url: "https://scoopempire.com/feed", host: "scoopempire.com", tier: 3 },
  { url: "https://identity-mag.com/feed", host: "identity-mag.com", tier: 3 },
  { url: "https://emirateswoman.com/feed", host: "emirateswoman.com", tier: 3 },
  { url: "https://www.cosmopolitanme.com/feed", host: "cosmopolitanme.com", tier: 3 },
  { url: "https://hypebeast.com/feed", host: "hypebeast.com", tier: 3 },
  { url: "https://www.highsnobiety.com/feed", host: "highsnobiety.com", tier: 3 },
  { url: "https://www.whowhatwear.com/feed.xml", host: "whowhatwear.com", tier: 3 },
  { url: "https://www.marieclaire.com/rss/all.xml", host: "marieclaire.com", tier: 3 },
  { url: "https://fashionista.com/feed", host: "fashionista.com", tier: 3 },
];

export interface FeedItem {
  title: string;
  url: string;
  date: string; // ISO
  summary: string;
  host: string;
  tier: 1 | 2 | 3;
}

const POOL_KEY = "live:rss-pool:v1";
const POOL_TTL = 3 * 60 * 60; // 3h — feeds don't move faster than that
const MAX_AGE_DAYS = 30;

// ── tiny XML helpers (no deps) ────────────────────────────────────────
function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : "";
}

function parseFeed(xml: string, def: FeedDef): FeedItem[] {
  const out: FeedItem[] = [];
  // RSS 2.0 <item> blocks; Atom <entry> blocks.
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const b of blocks.slice(0, 30)) {
    const title = stripTags(tag(b, "title"));
    // RSS link is text content; Atom link is <link href="..."/>
    let url = stripTags(tag(b, "link"));
    if (!url) url = (b.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || "";
    const dateRaw =
      tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date");
    const desc = tag(b, "description") || tag(b, "summary") || tag(b, "content:encoded");
    const parsed = dateRaw ? new Date(stripTags(dateRaw)) : null;
    if (!title || !url || !parsed || isNaN(parsed.getTime())) continue;
    const ageDays = (Date.now() - parsed.getTime()) / 86_400_000;
    if (ageDays > MAX_AGE_DAYS || ageDays < -1) continue;
    let summary = stripTags(desc);
    if (summary.length > 260) summary = summary.slice(0, 257).trimEnd() + "…";
    out.push({ title, url, date: parsed.toISOString(), summary, host: def.host, tier: def.tier });
  }
  return out;
}

async function fetchOneFeed(def: FeedDef): Promise<FeedItem[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6500);
    const res = await fetch(def.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FeedReader)" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return [];
    return parseFeed(await res.text(), def);
  } catch {
    return []; // fail soft — never break a generation over one dead feed
  }
}

// Fetch all feeds (Redis-cached 3h, shared by the whole team).
export async function getFeedPool(): Promise<FeedItem[]> {
  const cached = await getCachedReport<FeedItem[]>(POOL_KEY);
  if (cached?.data?.length) return cached.data;

  const all = (await Promise.all(FEEDS.map(fetchOneFeed))).flat();
  const seen = new Set<string>();
  const pool = all
    .filter((x) => (seen.has(x.url) ? false : (seen.add(x.url), true)))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  if (pool.length) await setCachedReport(POOL_KEY, pool, POOL_TTL);
  return pool;
}

// ── keyword search over the pool ─────────────────────────────────────
const STOPWORDS = new Set([
  "the", "and", "for", "with", "what", "this", "that", "from", "are", "now",
  "new", "2025", "2026", "egypt", "egyptian", "fashion", "trends", "trend",
  "style", "men", "women", "مصر", "موضة",
]);
// (generic words excluded from scoring so matches mean something; gender and
// Egypt relevance are carried by the queries' REAL terms: garments, fabrics, colours)

const FASHION_HINT = /\b(colou?r|fabric|linen|cotton|denim|wool|silk|knit|trouser|pant|chino|shirt|tee|polo|blazer|jacket|coat|dress|skirt|abaya|kaftan|suit|vest|shoe|shoes|loafer|sneaker|tie|belt|cufflink|brooch|socks|silhouette|tailor|wide.?leg|oversized|capsule|collection|runway|menswear|womenswear|beige|stone|olive|navy|pastel|earth tone|palette|modest|beachwear|summer|sahel|north coast)\b/i;
const REJECT_CONTEXT = /\b(politics|war|refugee|deportation|travel alert|tourism|monorail|museum|ancient|pharaoh|archaeology|stock market|football|crime|court|weather|transport)\b/i;

export async function searchFeedPool(queries: string[], limit = 10): Promise<Source[]> {
  try {
    const pool = await getFeedPool();
    if (!pool.length) return [];

    const terms = new Set<string>();
    for (const q of queries) {
      for (const w of q.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
        if (w.length >= 3 && !STOPWORDS.has(w)) terms.add(w);
      }
    }

    const scored = pool
      .map((it) => {
        const text = `${it.title} ${it.summary}`.toLowerCase();
        if (REJECT_CONTEXT.test(text)) return null;
        let hits = 0;
        for (const t of terms) if (text.includes(t)) hits++;
        const fashionable = FASHION_HINT.test(text);
        // Must connect to the request: term hits, or clearly fabric/colour/garment
        // content from tier-1 trade press (their whole feed is on-topic).
        if (hits < 1 && !(fashionable && it.tier === 1)) return null;
        if (hits < 1 && !fashionable) return null;
        const ageDays = (Date.now() - +new Date(it.date)) / 86_400_000;
        const score =
          0.5 +
          0.07 * Math.min(hits, 5) +
          (it.tier === 1 ? 0.15 : it.tier === 2 ? 0.08 : 0.04) +
          (ageDays <= 7 ? 0.1 : ageDays <= 21 ? 0.05 : 0) +
          (fashionable ? 0.05 : 0);
        return { it, score: Math.min(score, 0.99) };
      })
      .filter(Boolean) as { it: FeedItem; score: number }[];

    scored.sort((a, b) => b.score - a.score || +new Date(b.it.date) - +new Date(a.it.date));

    // Don't let one publisher flood the result — max 3 per host.
    const perHost = new Map<string, number>();
    const out: Source[] = [];
    for (const { it, score } of scored) {
      const n = perHost.get(it.host) ?? 0;
      if (n >= 3) continue;
      perHost.set(it.host, n + 1);
      out.push({ title: it.title, url: it.url, date: it.date, score, summary: it.summary });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return []; // never break the pipeline
  }
}
