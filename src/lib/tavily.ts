// ─── Tavily Web Search — Real-time market intelligence ───────────────
// Used by the research engine to search the live web before generating reports
// Searches TikTok trends, competitor pages, influencers, market news

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_URL = "https://api.tavily.com/search";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  results: TavilyResult[];
  answer?: string;
}

// ─── Core search function ─────────────────────────────────────────────
// Timeout wrapper — never block more than 8 seconds per search
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function tavilySearch(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
    includeAnswer?: boolean;
    days?: number; // how recent (days)
  } = {}
): Promise<{ results: TavilyResult[]; answer?: string; error?: string }> {
  if (!TAVILY_API_KEY) {
    return { results: [], error: "TAVILY_API_KEY not set" };
  }

  try {
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: options.maxResults ?? 5,
        search_depth: options.searchDepth ?? "basic",
        include_answer: options.includeAnswer ?? false,
        days: options.days ?? 7,
        include_domains: [],
        exclude_domains: [],
      }),
    });

    if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
    const data: TavilyResponse = await res.json();
    return { results: data.results ?? [], answer: data.answer };

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Tavily]", msg);
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
}

export async function collectSources(
  queries: { q: string; days?: number }[]
): Promise<Source[]> {
  const runs = await Promise.all(
    queries.map(({ q, days }) =>
      withTimeout(tavilySearch(q, { days: days ?? 14, maxResults: 4 }), 8000, FALLBACK))
  );
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const r of runs) {
    for (const x of r.results ?? []) {
      if (x.url && !seen.has(x.url)) {
        seen.add(x.url);
        sources.push({ title: x.title, url: x.url, date: x.published_date, score: x.score });
      }
    }
  }
  // Strongest signals first
  return sources.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

// ─── Specialized searches for Egyptian fashion market ─────────────────

const FALLBACK = { results: [], error: "timeout" };

export async function searchEgyptianFashionTrends(): Promise<string> {
  const searches = await Promise.all([
    withTimeout(tavilySearch("Egyptian fashion TikTok trends 2026 مصر موضة", { days: 7, maxResults: 3 }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egypt Instagram fashion trending hashtags summer 2026", { days: 7, maxResults: 3 }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egyptian fashion ecommerce trends June 2026", { days: 14, maxResults: 3 }), 8000, FALLBACK),
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
  const searches = await Promise.all([
    withTimeout(tavilySearch("Egyptian fashion influencers women TikTok Instagram 2026 مؤثرات موضة مصر", { days: 30, maxResults: 4 }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egyptian men fashion influencers TikTok 2026 مؤثرين رجالي مصر", { days: 30, maxResults: 4 }), 8000, FALLBACK),
    withTimeout(tavilySearch("top Egyptian fashion content creators 2026 brands collaboration", { days: 30, maxResults: 3 }), 8000, FALLBACK),
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
    withTimeout(tavilySearch("Egyptian fashion ecommerce market summer 2026 consumer behavior", { days: 14, maxResults: 3 }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egypt North Coast summer fashion shopping 2026 Sahel", { days: 14, maxResults: 3 }), 8000, FALLBACK),
    withTimeout(tavilySearch("Egyptian consumer spending fashion June 2026", { days: 14, maxResults: 3 }), 8000, FALLBACK),
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
