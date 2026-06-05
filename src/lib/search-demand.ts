// ─── Search Demand (the "searched about" layer) ──────────────────────
// FREE, no auth: Google autocomplete reveals what people actually TYPE to
// search — real demand direction (colours, gender, intent), not just what
// creators post about. Honest limit: gives the SHAPE of demand (queries),
// NOT search VOLUME (how many) — that needs Google Search Console.

export async function getSearchDemand(query: string): Promise<string[]> {
  if (!query) return [];
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&hl=en&gl=eg&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    // Google returns UTF-8; decode the bytes explicitly so Arabic isn't mojibake.
    const buf = await res.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(buf);
    const data = JSON.parse(text);
    const suggestions: string[] = Array.isArray(data?.[1]) ? data[1] : [];
    // Drop the seed itself, dedupe, keep the most useful few.
    const seed = query.toLowerCase().trim();
    return suggestions
      .filter((s) => typeof s === "string" && s.toLowerCase().trim() !== seed)
      .slice(0, 6);
  } catch {
    return [];
  }
}
