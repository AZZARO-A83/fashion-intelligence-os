// ─── Web Search — Google Custom Search (real-time market intelligence) ─
// Swapped from Tavily → Google Programmable Search. Credibility = the engine
// (cx) is locked to the user's hand-picked trusted fashion/Egypt magazines,
// so every result is from a real authority. Egypt bias via gl=eg. Free tier:
// 100 queries/day (renews daily) — so we keep it to ONE call per query.
// NOTE: function names kept (tavilySearch/collectSources/…) so the rest of
// the app keeps working unchanged.

const GOOGLE_KEY = process.env.GOOGLE_SEARCH_KEY;
const GOOGLE_CX = process.env.GOOGLE_SEARCH_CX;
const CSE_URL = "https://www.googleapis.com/customsearch/v1";

// ─── Trusted fashion sources (now governed by the Google engine's cx) ──
// Kept for reference + any caller that still imports them. The real source
// restriction lives in the Programmable Search Engine's "Sites to search".
export const FASHION_SOURCE_DOMAINS = [
  "thebeesmagazine.com", "modash.io", "ellearabia.com",
  "harpersbazaararabia.com", "vogue.com", "businessoffashion.com",
  "scoopempire.com", "fibre2fashion.com", "fustany.com", "gqmiddleeast.com",
];

const FASHION_NEWS_DOMAINS = [
  "fibre2fashion.com", "businessoffashion.com", "vogue.com",
  "harpersbazaararabia.com", "scoopempire.com", "wwd.com",
];

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

// Never block more than N ms per search.
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const FALLBACK = { results: [] as TavilyResult[], error: "timeout" };

// Best-effort published date from Google's pagemap metadata.
function extractDate(item: Record<string, unknown>): string | undefined {
  const pm = item.pagemap as { metatags?: Record<string, string>[]; newsarticle?: Record<string, string>[] } | undefined;
  const meta = pm?.metatags?.[0] || {};
  return (
    meta["article:published_time"] ||
    meta["article:modified_time"] ||
    meta["og:updated_time"] ||
    pm?.newsarticle?.[0]?.datepublished ||
    undefined
  );
}

// One Google Custom Search call. options kept for signature compatibility;
// includeDomains/searchDepth are ignored (the engine's cx governs domains).
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
): Promise<{ results: TavilyResult[]; answer?: string; error?: string }> {
  if (!GOOGLE_KEY || !GOOGLE_CX) {
    return { results: [], error: "GOOGLE_SEARCH_KEY / GOOGLE_SEARCH_CX not set" };
  }
  try {
    const num = Math.min(Math.max(options.maxResults ?? 8, 1), 10);
    const days = Math.min(Math.max(options.days ?? 30, 1), 365);
    const params = new URLSearchParams({
      key: GOOGLE_KEY,
      cx: GOOGLE_CX,
      q: query,
      num: String(num),
      gl: "eg",            // Egypt geographic bias (soft, not a hard filter)
      safe: "off",
      dateRestrict: `d${days}`,
    });
    if (options.topic === "news") params.set("sort", "date");

    const res = await fetch(`${CSE_URL}?${params.toString()}`);
    if (!res.ok) {
      // 429 = daily 100-query quota used up.
      throw new Error(res.status === 429 ? "Google daily search limit reached" : `Google CSE ${res.status}`);
    }
    const data = await res.json();
    const items: Record<string, unknown>[] = Array.isArray(data.items) ? data.items : [];
    const results: TavilyResult[] = items.map((it, i) => ({
      title: String(it.title || ""),
      url: String(it.link || ""),
      content: String(it.snippet || ""),
      score: Math.max(0.5, 0.9 - i * 0.05), // Google returns by relevance → rank-based score
      published_date: extractDate(it),
    }));
    return { results };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[GoogleCSE]", msg);
    return { results: [], error: msg };
  }
}

// ─── Format results for AI prompt ────────────────────────────────────
// Truncates each result's content to keep total tokens under Groq's 12k/min
// limit WITHOUT dropping any source. Every search, every URL, and the lead
// fact (always at the top of a Tavily blurb) are preserved — only the
// fluffy tail of each blurb is trimmed. Free, no crash, sources stay honest.
const MAX_CONTENT_CHARS = 350;

function truncateContent(content: string): string {
  if (!content || content.length <= MAX_CONTENT_CHARS) return content;
  // Cut at the last sentence boundary before the limit, so we never end mid-word.
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

// ─── Source collection (for credibility / verification) ──────────────
// Returns the REAL web sources behind a research run so the user can click
// and verify every claim. Empty array means the live search returned nothing
// (e.g. TAVILY_API_KEY missing) — the UI must then NOT claim "live".
export interface Source {
  title: string;
  url: string;
  date?: string;
  score?: number;
  summary?: string; // 1-2 line takeaway from the article so you know what's in it
}

// Turn a raw page snippet into a clean 1-2 sentence summary — strips nav menus,
// markdown headers, and the repeated title, then keeps the first real prose.
function cleanSnippet(content: string, title: string): string {
  // Title without the trailing " - publisher" so we can strip its repeats.
  const baseTitle = title.replace(/\s*[-|–]\s*[^-|–]+$/, "").trim();
  let s = content
    .replace(/^#+\s*/gm, " ")                 // markdown headers
    .replace(/\bloading\.\.\.?/gi, " ")
    .replace(/Automated translation[^.]*?original [a-z]{2}/gi, " ")
    .replace(/\bPRESS RELEASE\b/gi, " ")
    .replace(/\b(Home|Press|News|Fashion|Menu)\b/g, " ");
  if (baseTitle.length > 6) s = s.split(baseTitle).join(" "); // remove ALL title repeats
  s = s.replace(/\s+/g, " ").trim();
  // Prefer the first sentence(s) with real substance (≥ 8 words).
  const sentences = s.split(/(?<=[.!?])\s+/).filter((t) => t.split(" ").length >= 8);
  const out = (sentences.slice(0, 2).join(" ") || s).trim();
  return out.length > 260 ? out.slice(0, 257).trimEnd() + "…" : out;
}

export async function collectSources(
  // domains: undefined = premium fashion sources (credibility). null = OPEN WEB
  // (discovery — what Egyptians actually search/post/sell). Array = custom.
  queries: { q: string; days?: number; topic?: "general" | "news"; domains?: string[] | null }[]
): Promise<Source[]> {
  // ONE Google call per query (free tier = 100/day, so we don't double up).
  const runs = await Promise.all(
    queries.map(({ q, days, topic }) =>
      withTimeout(
        tavilySearch(q, { days: days ?? 30, maxResults: 8, topic: topic ?? "general" }),
        9000,
        FALLBACK
      )
    )
  );
  const seen = new Set<string>();
  const sources: Source[] = [];
  // Drop junk: generic platform-only titles, no real content, or low relevance.
  const genericTitle = /^(instagram|tiktok|facebook|tik tok)\.?$/i;
  for (const r of runs) {
    for (const x of r.results ?? []) {
      const title = (x.title || "").trim();
      const snippet = cleanSnippet(x.content || "", title);
      const relevant = (x.score ?? 0) >= 0.4 && title.length > 3 && !genericTitle.test(title) && snippet.length > 40;
      if (x.url && !seen.has(x.url) && relevant) {
        seen.add(x.url);
        sources.push({ title, url: x.url, date: x.published_date, score: x.score, summary: snippet });
      }
    }
  }
  // Dated sources (real articles/posts) first, then by relevance.
  return sources.sort((a, b) => {
    if (!!a.date !== !!b.date) return a.date ? -1 : 1;
    return (b.score ?? 0) - (a.score ?? 0);
  });
}

// ─── Specialized searches for Egyptian fashion market ─────────────────

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
