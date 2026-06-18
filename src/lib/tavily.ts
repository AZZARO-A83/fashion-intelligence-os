// ─── Web Search — Serper (Google Search results via simple API) ──────────
// Serper returns the same Google index — full credibility, Arabic + English,
// Egyptian fashion content, competitor pages. 2,500 searches/month free.
// NOTE: function names kept (tavilySearch/collectSources/…) so nothing else breaks.

import { recordSerperUsage } from "@/lib/cache";
import { searchFeedPool } from "@/lib/feeds";

const SERPER_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = "https://google.serper.dev/search";
const MAX_SOURCE_AGE_DAYS = 30;

export const FASHION_SOURCE_DOMAINS = [
  "thebeesmagazine.com", "modash.io", "ellearabia.com",
  "harpersbazaararabia.com", "vogue.com", "businessoffashion.com",
  "scoopempire.com", "fibre2fashion.com", "fustany.com", "gqmiddleeast.com",
  "cairoscene.com", "identity-mag.com", "egypttoday.com", "whatwomenwant-mag.com",
  "en.vogue.me", "graziamagazine.com", "sayidaty.net", "hiamag.com",
];

const FASHION_NEWS_DOMAINS = [
  "fibre2fashion.com", "businessoffashion.com", "vogue.com",
  "harpersbazaararabia.com", "scoopempire.com", "wwd.com",
  "fustany.com", "cairoscene.com", "identity-mag.com", "egypttoday.com",
  "sayidaty.net", "hiamag.com",
];

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const FALLBACK = { results: [] as TavilyResult[], error: "timeout" };

function serperDateWindow(days?: number): string {
  const boundedDays = Math.min(Math.max(days ?? MAX_SOURCE_AGE_DAYS, 1), MAX_SOURCE_AGE_DAYS);
  if (boundedDays <= 1) return "qdr:d";
  if (boundedDays <= 7) return "qdr:w";
  return "qdr:m";
}

function parseSourceDate(date?: string): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isFreshSource(date?: string, maxDays = MAX_SOURCE_AGE_DAYS): boolean {
  const parsed = parseSourceDate(date);
  if (!parsed) return false;
  const ageDays = (Date.now() - parsed.getTime()) / 86_400_000;
  return ageDays >= -1 && ageDays <= maxDays;
}

function hasFashionIntent(text: string): boolean {
  return /\b(fashion|style|outfit|wear|clothing|apparel|collection|new arrival|dress|shirt|polo|tee|t-shirt|trouser|pants|jeans|chino|blazer|suit|jacket|skirt|blouse|top|co-ord|set|abaya|kaftan|vest|shoe|shoes|loafer|sneaker|tie|belt|cufflink|brooch|socks|linen|cotton|denim|viscose|silk|satin|chiffon|modest|menswear|womenswear|street style|summer|beachwear|sahel|north coast|ملابس|لبس|موضة|ستايل|ترند|كولكشن|تشكيلة|فستان|فساتين|قميص|قمصان|تيشيرت|بولو|بنطلون|بناطيل|جينز|بلوزة|توب|تنورة|جيبة|بدلة|بليزر|جاكيت|عباية|قفطان|فيست|حذاء|جزمة|لوفر|كوتشي|كرافت|حزام|شراب|كتان|قطن|دانتيل|شيفون|ستان|صيف|ساحل|كاجوال|فورمال)\b/i.test(text);
}

function isRejectedContext(text: string): boolean {
  return /\b(politics|war|refugee|deportation|travel alert|tourism|monorail|museum|ancient|pharaoh|archaeology|stock market|football|crime|court|weather|transport)\b/i.test(text);
}

export async function tavilySearch(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
    includeAnswer?: boolean;
    days?: number;
    topic?: "general" | "news";
    includeDomains?: string[];
  } = {}
): Promise<{ results: TavilyResult[]; answer?: string; error?: string; _raw?: Record<string, unknown> }> {
  if (!SERPER_KEY) {
    return { results: [], error: "SERPER_API_KEY not set" };
  }
  try {
    const num = Math.min(Math.max(options.maxResults ?? 15, 1), 20);
    const body: Record<string, unknown> = {
      q: query,
      gl: "eg",
      hl: "en",
      num,
      tbs: serperDateWindow(options.days),
    };
    if (options.topic === "news") body.type = "news";

    if (options.includeDomains && options.includeDomains.length > 0) {
      const siteFilter = options.includeDomains.map((d) => `site:${d}`).join(" OR ");
      body.q = `${query} (${siteFilter})`;
    }

    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Serper ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const organic: Record<string, unknown>[] = Array.isArray(data.organic) ? data.organic : [];
    const newsItems: Record<string, unknown>[] = Array.isArray(data.news) ? data.news : [];
    const items = options.topic === "news" ? [...newsItems, ...organic] : [...organic, ...newsItems];

    const results: TavilyResult[] = items.slice(0, num).map((it, i) => ({
      title: String(it.title || ""),
      url: String(it.link || ""),
      content: String(it.snippet || ""),
      score: Math.max(0.5, 0.9 - i * 0.05),
      published_date: it.date ? String(it.date) : undefined,
    }));

    // Serper bills by result count, not per call: >10 results = 2 credits.
    // The response body reports the exact cost — trust it; estimate as fallback.
    recordSerperUsage(Number(data.credits) || (num > 10 ? 2 : 1));
    return { results, _raw: data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Serper]", msg);
    return { results: [], error: msg };
  }
}

// ─── Dynamic customer search signals (from Serper relatedSearches) ───
// Runs 3 broad Egypt fashion queries and extracts what customers are ACTUALLY
// searching right now — relatedSearches + peopleAlsoAsk from Google.
// Returns 10-20 unique real search queries, updated every generation.
export interface DynamicSearchSignals {
  menSignals: string[];
  womenSignals: string[];
  generalSignals: string[];
}

export async function getSerperDynamicSearchSignals(): Promise<DynamicSearchSignals> {
  if (!SERPER_KEY) return { menSignals: [], womenSignals: [], generalSignals: [] };

  const queries = [
    { q: "ملابس رجالي صيف 2026 مصر ترندات قمصان بولو بناطيل", gender: "men" as const },
    { q: "ملابس نسائي صيف 2026 مصر ترندات فساتين بلوزات بناطيل", gender: "women" as const },
    { q: "Egyptian clothing trends what people buying 2026 ملابس موضة مصر", gender: "general" as const },
  ];

  const results = await Promise.all(
    queries.map(async ({ q }) => {
      try {
        const res = await fetch(SERPER_URL, {
          method: "POST",
          headers: { "X-API-KEY": SERPER_KEY!, "Content-Type": "application/json" },
          body: JSON.stringify({ q, gl: "eg", hl: "en", num: 10, tbs: serperDateWindow(30) }),
        });
        if (!res.ok) return { related: [], paa: [] };
        const data = await res.json();
        recordSerperUsage(Number(data.credits) || 1); // num=10 here → 1 credit
        const related: string[] = (data.relatedSearches || []).map((r: Record<string, string>) => r.query).filter(Boolean);
        const paa: string[] = (data.peopleAlsoAsk || []).map((r: Record<string, string>) => r.question).filter(Boolean);
        return { related, paa };
      } catch { return { related: [], paa: [] }; }
    })
  );

  // Fashion-only filter — drop non-buying queries
  const fashionFilter = /\b(wear|cloth|outfit|dress|shirt|trouser|pant|linen|cotton|fabric|style|fashion|trend|colour|color|brand|buy|shop|summer|winter|casual|formal|look|collection|ملابس|لبس|موضة|ستايل|ترند|فستان|قمصان|قميص|تيشيرت|بولو|بنطلون|بناطيل|جينز|بلوزة|توب|تنورة|جيبة|بدلة|حزام|جزمة|حذاء|صيف|كاجوال|فورمال)\b/i;
  const clean = (arr: string[]) => arr.filter(s => fashionFilter.test(s) && s.length > 8 && s.length < 80);

  return {
    menSignals: clean([...results[0].related, ...results[0].paa]).slice(0, 15),
    womenSignals: clean([...results[1].related, ...results[1].paa]).slice(0, 15),
    generalSignals: clean([...results[2].related, ...results[2].paa]).slice(0, 10),
  };
}

// ─── Format results for AI prompt ────────────────────────────────────
const MAX_CONTENT_CHARS = 350;

function truncateContent(content: string): string {
  if (!content || content.length <= MAX_CONTENT_CHARS) return content;
  const slice = content.slice(0, MAX_CONTENT_CHARS);
  const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  return (lastStop > 200 ? slice.slice(0, lastStop + 1) : slice).trim() + " …";
}

function formatResults(results: TavilyResult[]): string {
  if (!results.length) return "No results found.";
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${truncateContent(r.content)}\nSource: ${r.url}`)
    .join("\n\n");
}

export interface Source {
  title: string;
  url: string;
  date?: string;
  score?: number;
  summary?: string;
}

function cleanSnippet(content: string, title: string): string {
  const baseTitle = title.replace(/\s*[-|–]\s*[^-|–]+$/, "").trim();
  let s = content
    .replace(/^#+\s*/gm, " ")
    .replace(/\bloading\.\.\.?/gi, " ")
    .replace(/Automated translation[^.]*?original [a-z]{2}/gi, " ")
    .replace(/\bPRESS RELEASE\b/gi, " ")
    .replace(/\b(Home|Press|News|Fashion|Menu)\b/g, " ");
  if (baseTitle.length > 6) s = s.split(baseTitle).join(" ");
  s = s.replace(/\s+/g, " ").trim();
  const sentences = s.split(/(?<=[.!?])\s+/).filter((t) => t.split(" ").length >= 8);
  const out = (sentences.slice(0, 2).join(" ") || s).trim();
  return out.length > 260 ? out.slice(0, 257).trimEnd() + "…" : out;
}

export async function collectSources(
  queries: { q: string; days?: number; topic?: "general" | "news"; domains?: string[] | null }[]
): Promise<Source[]> {
  // Two legs, in parallel: Serper (Google results) + publisher RSS feeds
  // (free, unlimited, direct from the trusted magazines). RSS is append-only
  // and fail-soft — it can only ADD sources, never break the Serper leg.
  const [runs, feedSources] = await Promise.all([
    Promise.all(
      queries.map(({ q, days, topic, domains }) =>
        withTimeout(
          tavilySearch(q, {
            days: days ?? 30,
            maxResults: 8,
            topic: topic ?? "general",
            includeDomains: domains ?? undefined,
          }),
          9000,
          FALLBACK
        )
      )
    ),
    searchFeedPool(queries.map((x) => x.q), 10),
  ]);
  const seen = new Set<string>();
  const sources: Source[] = [];
  const genericTitle = /^(instagram|tiktok|facebook|tik tok)\.?$/i;
  for (const r of runs) {
    for (const x of r.results ?? []) {
      const title = (x.title || "").trim();
      const snippet = cleanSnippet(x.content || "", title);
      const text = `${title} ${snippet}`;
      const relevant =
        (x.score ?? 0) >= 0.4 &&
        title.length > 3 &&
        !genericTitle.test(title) &&
        snippet.length > 40 &&
        isFreshSource(x.published_date) &&
        hasFashionIntent(text) &&
        !isRejectedContext(text);
      if (x.url && !seen.has(x.url) && relevant) {
        seen.add(x.url);
        sources.push({ title, url: x.url, date: x.published_date, score: x.score, summary: snippet });
      }
    }
  }
  // Publisher-direct articles (already dated, scored, max 3 per magazine).
  for (const s of feedSources) {
    const text = `${s.title} ${s.summary || ""}`;
    if (
      s.url &&
      !seen.has(s.url) &&
      isFreshSource(s.date) &&
      hasFashionIntent(text) &&
      !isRejectedContext(text)
    ) {
      seen.add(s.url);
      sources.push(s);
    }
  }
  return sources.sort((a, b) => {
    if (!!a.date !== !!b.date) return a.date ? -1 : 1;
    return (b.score ?? 0) - (a.score ?? 0);
  });
}

export async function searchEgyptianFashionTrends(): Promise<string> {
  const D = FASHION_SOURCE_DOMAINS;
  const searches = await Promise.all([
    withTimeout(tavilySearch("Egyptian men women premium fashion clothing trends 2026 مصر موضة ملابس", { days: 14, maxResults: 3, searchDepth: "advanced", includeDomains: D }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egypt Cairo Sahel fashion style outfits men women 2026", { days: 14, maxResults: 3, searchDepth: "advanced", includeDomains: D }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egyptian fashion week designers premium clothing 2026", { days: 30, maxResults: 3, searchDepth: "advanced", includeDomains: D }), 8000, FALLBACK),
  ]);

  return `
LIVE TREND SEARCH RESULTS (searched today):

=== TikTok Egypt Fashion Trends ===
${formatResults(searches[0].results)}

=== Instagram Egypt Trending ===
${formatResults(searches[1].results)}

=== Egyptian Fashion Market News ===
${formatResults(searches[2].results)}
`.trim();
}

export async function searchCompetitorActivity(): Promise<string> {
  const searches = await Promise.all([
    withTimeout(tavilySearch("Tie House Egypt fashion 2026 campaign collection", { days: 30, maxResults: 3 }), 8000, FALLBACK),
    withTimeout(tavilySearch("British House Egypt fashion shirts 2026", { days: 30, maxResults: 3 }), 8000, FALLBACK),
    withTimeout(tavilySearch("Massimo Dutti Egypt 2026 collection summer", { days: 30, maxResults: 3 }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egyptian premium fashion brands 2026 competition", { days: 30, maxResults: 3 }), 8000, FALLBACK),
  ]);

  return `
COMPETITOR LIVE RESEARCH (searched today):

=== Tie House Egypt ===
${formatResults(searches[0].results)}

=== British House Egypt ===
${formatResults(searches[1].results)}

=== Massimo Dutti Egypt ===
${formatResults(searches[2].results)}

=== Egyptian Premium Fashion Market ===
${formatResults(searches[3].results)}
`.trim();
}

export async function searchEgyptianInfluencers(): Promise<string> {
  const D = ["instagram.com", "modash.io", "facebook.com", "thebeesmagazine.com"];
  const searches = await Promise.all([
    withTimeout(tavilySearch("Egyptian fashion influencers women Instagram 2026 مؤثرات موضة مصر", { days: 45, maxResults: 4, searchDepth: "advanced", includeDomains: D }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egyptian men fashion influencers 2026 مؤثرين رجالي مصر", { days: 45, maxResults: 4, searchDepth: "advanced", includeDomains: D }), 8000, FALLBACK),
    withTimeout(tavilySearch("top Egyptian fashion content creators 2026 brand collaboration", { days: 45, maxResults: 3, searchDepth: "advanced", includeDomains: D }), 8000, FALLBACK),
  ]);

  return `
EGYPTIAN FASHION INFLUENCERS (searched today):

=== Women Fashion Influencers Egypt ===
${formatResults(searches[0].results)}

=== Men Fashion Influencers Egypt ===
${formatResults(searches[1].results)}

=== Top Egyptian Fashion Content Creators ===
${formatResults(searches[2].results)}
`.trim();
}

export async function searchMarketIntelligence(): Promise<string> {
  const searches = await Promise.all([
    withTimeout(tavilySearch("Egyptian fashion clothing market 2026 men women premium", { days: 30, maxResults: 3, searchDepth: "advanced", includeDomains: FASHION_NEWS_DOMAINS }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egypt fashion retail trends consumer 2026", { days: 30, maxResults: 3, searchDepth: "advanced", includeDomains: FASHION_NEWS_DOMAINS }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egyptian fashion industry news 2026", { days: 30, maxResults: 3, searchDepth: "advanced", topic: "news", includeDomains: FASHION_NEWS_DOMAINS }), 8000, FALLBACK),
  ]);

  return `
MARKET INTELLIGENCE (searched today):

=== Consumer Behavior Egypt 2026 ===
${formatResults(searches[0].results)}

=== North Coast Summer Market ===
${formatResults(searches[1].results)}

=== Egyptian Consumer Spending ===
${formatResults(searches[2].results)}
`.trim();
}
