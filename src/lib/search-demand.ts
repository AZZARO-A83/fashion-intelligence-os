// ─── Search Demand (the "searched about" layer) ──────────────────────
// FREE, no auth: search-engine autocomplete reveals what people actually
// TYPE to search — real demand direction (colours, gender, intent), not
// just what creators post about. Honest limit: gives the SHAPE of demand
// (queries), NOT search VOLUME (how many) — that needs Google Search Console.
//
// Robust by design: Google autocomplete is richest but can block datacenter
// IPs (e.g. Vercel's servers). So we chain Google → Bing → DuckDuckGo and
// return the first source that answers. All three are free and key-less.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const hasArabic = (s: string) => /[؀-ۿ]/.test(s);

async function tryGoogle(query: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=chrome&hl=${hasArabic(query) ? "ar" : "en"}&gl=eg&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const buf = await res.arrayBuffer();
  const data = JSON.parse(new TextDecoder("utf-8").decode(buf));
  return Array.isArray(data?.[1]) ? data[1] : [];
}

async function tryBing(query: string): Promise<string[]> {
  const market = hasArabic(query) ? "ar-EG" : "en-EG";
  const url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}&market=${market}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const buf = await res.arrayBuffer();
  const data = JSON.parse(new TextDecoder("utf-8").decode(buf));
  return Array.isArray(data?.[1]) ? data[1] : [];
}

async function tryDuckDuckGo(query: string): Promise<string[]> {
  const kl = hasArabic(query) ? "eg-ar" : "eg-en";
  const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&kl=${kl}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const buf = await res.arrayBuffer();
  const data = JSON.parse(new TextDecoder("utf-8").decode(buf));
  // DDG returns [{ phrase: "..." }, ...]
  return Array.isArray(data) ? data.map((d) => d?.phrase).filter(Boolean) : [];
}

function clean(suggestions: string[], seed: string): string[] {
  const s = seed.toLowerCase().trim();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of suggestions) {
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    const key = v.toLowerCase();
    if (!v || key === s || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out.slice(0, 6);
}

export async function getSearchDemand(query: string): Promise<string[]> {
  if (!query) return [];
  // DDG and Bing answer better to a tight seed (long "...egypt" tails return []),
  // so we also keep a trimmed variant for the fallbacks.
  const trimmed = query.replace(/\s+egypt$/i, "").trim() || query;

  const attempts: Array<() => Promise<string[]>> = [
    () => tryGoogle(query),
    () => tryBing(query),
    () => tryBing(trimmed),
    () => tryDuckDuckGo(trimmed),
  ];

  for (const attempt of attempts) {
    try {
      const res = clean(await attempt(), query);
      if (res.length) return res;
    } catch {
      // try the next source
    }
  }
  return [];
}
