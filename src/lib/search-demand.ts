// ─── Search Demand (the "searched about" layer) ──────────────────────
// FREE, no auth: search-engine autocomplete reveals what people actually
// TYPE to search — real demand direction (colours, fabrics, garment types,
// gender, intent), not just what creators post about. Honest limit: gives
// the SHAPE of demand (queries), NOT search VOLUME — that needs Search Console.
//
// Robust by design: Google autocomplete is richest but can block datacenter
// IPs (e.g. Vercel). So we chain Google → Bing → DuckDuckGo and return the
// first source that answers. All three are free and key-less.

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
  return Array.isArray(data) ? data.map((d) => d?.phrase).filter(Boolean) : [];
}

// One query → the first engine that answers. Returns raw suggestions (uncapped).
async function fetchOnce(query: string): Promise<string[]> {
  const attempts = [() => tryGoogle(query), () => tryBing(query), () => tryDuckDuckGo(query)];
  for (const attempt of attempts) {
    try {
      const r = await attempt();
      if (r.length) return r;
    } catch {
      /* next source */
    }
  }
  return [];
}

// Drop noise: the seed itself, dupes, pure brand/store spam optional.
function clean(suggestions: string[], drop: string[]): string[] {
  const banned = new Set(drop.map((d) => d.toLowerCase().trim()));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of suggestions) {
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    const key = v.toLowerCase();
    if (!v || banned.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

// Back-compat: single tight list (used where a quick 6 is enough).
export async function getSearchDemand(query: string): Promise<string[]> {
  if (!query) return [];
  const trimmed = query.replace(/\s+egypt$/i, "").trim() || query;
  for (const q of [query, trimmed]) {
    const r = clean(await fetchOnce(q), [query]);
    if (r.length) return r.slice(0, 6);
  }
  return [];
}

// ─── TOP-20 GENDERED DEMAND ───────────────────────────────────────────
// What real Egyptian consumers TYPE about this garment — split men vs women,
// ranked by how often a phrase shows up across several query angles. Biased
// toward colours / fabrics / clothing types (that's what the tails reveal).
export interface GenderedDemand {
  men: string[];
  women: string[];
}

// ─── Arabic garment vocabulary ─────────────────────────────────────────
// Egyptian colloquial — what customers actually type on Google Egypt in Arabic
const ARABIC_GARMENT: Record<string, string> = {
  polo:     "بولو",
  shirt:    "قميص",
  trouser:  "بنطال",
  chino:    "بنطال شينو",
  denim:    "جينز",
  jeans:    "جينز",
  blazer:   "بليزر",
  suit:     "بدلة",
  dress:    "فستان",
  jumpsuit: "جمبسوت",
  skirt:    "تنورة",
  abaya:    "عباءة",
  kaftan:   "قفطان",
  set:      "طقم",
  coord:    "طقم",
  shorts:   "شورت",
  jacket:   "جاكيت",
  linen:    "كتان",
  cotton:   "قطن",
  bamboo:   "بامبو",
  viscose:  "فيسكوز",
  silk:     "حرير",
  chiffon:  "شيفون",
  modal:    "مودال",
  poplin:   "بوبلين",
  pique:    "بيكيه",
};

const ARABIC_GENDER: Record<"men" | "women", string> = {
  men:   "رجالي",
  women: "نسائي",
};

function garmentToArabic(garment: string): string | null {
  const g = garment.toLowerCase();
  for (const [key, arabic] of Object.entries(ARABIC_GARMENT)) {
    if (g.includes(key)) return arabic;
  }
  return null;
}

function buildQueries(garment: string, gender: "men" | "women"): string[] {
  const g = garment.toLowerCase().replace(/\s+egypt$/i, "").trim();
  const w = gender;
  const ar = garmentToArabic(g);
  const arG = ARABIC_GENDER[gender];

  // English: 3 queries — minority (not all Egyptians search in English)
  const queries: string[] = [
    `${g} ${w} egypt`,
    `${g} ${w}`,
    `${g} ${w} 2026`,
  ];

  // Arabic: 5 queries — majority (most Egyptians search in Arabic)
  // hasArabic() in each fetch function auto-switches to hl=ar / market=ar-EG / kl=eg-ar
  if (ar) {
    queries.push(
      `${ar} ${arG} مصر`,   // e.g. "بولو رجالي مصر"
      `${ar} ${arG}`,        // e.g. "بولو رجالي"
      `${ar} مصر`,           // e.g. "بولو مصر"
      `${ar} مصر 2026`,      // e.g. "بولو مصر 2026"
      `${arG} ${ar}`,        // e.g. "رجالي بولو" — reversed order surfaces different tails
    );
  }

  return queries;
}

// Definitional / non-buying queries — drop them so the list is pure demand.
const NOISE = /\b(history|origin|meaning|mean|means|definition|define|describe|what are|what is|why are|vs|versus|wikipedia|how much does|cost|price meaning)\b/i;

// Non-English/Non-Arabic foreign language words (Portuguese, Spanish, French most common in autocomplete)
const FOREIGN = /\b(vestido|camisa|pantalon|para|hombre|mujer|roupas?|calca|roupa|pour|homme|femme|moda|ropa|avec|leur|une|les|kleid|pantalón|camiseta|vestir|usar)\b/i;

// Geographic junk — UK/US suffixes that pollute Egypt-focused queries
const GEO_JUNK = /\b(uk|united kingdom|britain|british|american|europe|european|dubai|saudi|gulf)\s*$/i;

// Cold-weather items irrelevant to Egyptian summer (June–Sept, 35–42°C)
// Includes Arabic cold-weather terms: جلد=leather, صوف=wool, كنزة=sweater
const COLD_ITEMS = /\b(leather jacket|leather coat|wool coat|puffer jacket|puffer coat|down jacket|winter coat|heavy coat|sweater|sweatshirt|hoodie|turtleneck|cashmere coat|fleece|thermal|overcoat)\b|جاكيت جلد|معطف جلد|معطف صوف|جاكيت شتوي|كنزة صوف|بلوفر شتوي/i;

// Fuzzy key: strip prepositions so near-duplicates collapse.
// Arabic strings pass through as-is — Arabic prepositions are prefixes, not standalone words.
function fuzzyKey(s: string): string {
  if (hasArabic(s)) return s.trim();
  return s.toLowerCase()
    .replace(/\b(de|em|le|la|les|el|los|for|in|with|the|a|an|and|or)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}

async function topDemand(garment: string, gender: "men" | "women", limit: number): Promise<string[]> {
  const queries = Array.from(new Set(buildQueries(garment, gender)));
  const results = await Promise.all(queries.map((q) => fetchOnce(q).catch(() => [])));

  // Rank by frequency across angles, then by first appearance.
  const score = new Map<string, { phrase: string; count: number; order: number }>();
  const fuzzySet = new Set<string>(); // for fuzzy dedup
  let order = 0;
  for (const list of results) {
    for (const raw of clean(list, [garment.toLowerCase()])) {
      if (NOISE.test(raw)) continue;
      if (FOREIGN.test(raw)) continue;    // drop Portuguese/Spanish/French
      if (GEO_JUNK.test(raw)) continue;  // drop "...uk", "...us" suffixes
      if (COLD_ITEMS.test(raw)) continue; // drop cold-weather items (Egypt summer)
      const key = raw.toLowerCase();
      const fkey = fuzzyKey(raw);
      if (fuzzySet.has(fkey)) continue;  // near-duplicate — skip
      fuzzySet.add(fkey);
      const cur = score.get(key);
      if (cur) cur.count += 1;
      else score.set(key, { phrase: raw, count: 1, order: order++ });
    }
  }
  return [...score.values()]
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map((x) => x.phrase)
    .slice(0, limit);
}

export async function getGenderedDemand(garment: string, limit = 18): Promise<GenderedDemand> {
  if (!garment) return { men: [], women: [] };
  const [men, women] = await Promise.all([
    topDemand(garment, "men", limit),
    topDemand(garment, "women", limit),
  ]);
  return { men, women };
}
