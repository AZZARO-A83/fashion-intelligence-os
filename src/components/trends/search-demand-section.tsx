"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, Flame, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RichTrend } from "@/lib/trend-engine";

// ─── Types ────────────────────────────────────────────────────────────
interface ShopifyProduct {
  title: string;
  image: string;
  url: string;
  price: string;
  type: string;
  gender: "men" | "women" | "unisex";
}

interface GarmentInsight {
  rank: number;
  garment: string;
  score: number;
  heatLevel: 1 | 2 | 3;
  fabrics: { fabric: string; count: number }[];
}

interface DemandTerm {
  rank: number;
  query: string;
  score: number;
  heatLevel: 1 | 2 | 3;
  sourceGarment: string;
  matchedProduct?: ShopifyProduct;
}

// ─── Constants ────────────────────────────────────────────────────────
const GARMENT_WORDS = [
  "suit","suits","blazer","blazers","jacket","jackets",
  "trouser","trousers","chino","chinos","pant","pants","jeans","denim",
  "polo","t-shirt","tshirt","t shirt","tee","shirt","shirts","top","blouse","kaftan","abaya",
  "dress","dresses","midi","maxi","mini","skirt","gown",
  "jumpsuit","romper","playsuit","co-ord","coord","set","sets",
  "shorts","overall","overalls",
  // removed: coat/coats, cardigan, sweater, knit, knitwear — cold-weather, irrelevant in Egyptian summer
];

const CANONICAL: Record<string, string> = {
  suits:"suit", blazers:"blazer", jackets:"jacket", coats:"coat",
  trousers:"trouser", chinos:"chino", pants:"pant", jeans:"denim",
  "t-shirt":"tshirt", "t shirt":"tshirt", tee:"tshirt",
  shirts:"shirt", dresses:"dress", sets:"set", coords:"co-ord",
  overalls:"overall", knitwear:"knit",
};

const FABRICS = [
  "bamboo","linen","cotton","denim","viscose","chiffon","silk",
  "wool","jersey","poplin","modal","tencel","rayon","satin","polyester",
];

// ─── Gender detection ─────────────────────────────────────────────────
const WOMEN_KEYWORDS = /\b(women|woman|ladies|lady|female|girl|her|feminine|dress|dresses|skirt|abaya|kaftan|midi|maxi|blouse|playsuit|romper)\b/i;
const MEN_KEYWORDS   = /\b(men|man|male|guy|his|masculine|gents|trouser|chino|blazer|suit|polo)\b/i;

function detectProductGender(title: string, type: string): "men" | "women" | "unisex" {
  const text = `${title} ${type}`.toLowerCase();
  const isWomen = WOMEN_KEYWORDS.test(text);
  const isMen   = MEN_KEYWORDS.test(text);
  if (isWomen && !isMen) return "women";
  if (isMen  && !isWomen) return "men";
  return "men";
}

function extractGarmentWord(query: string): string | null {
  const q = query.toLowerCase();
  const found = GARMENT_WORDS.find((g) => new RegExp(`\\b${g}\\b`).test(q));
  if (!found) return null;
  return CANONICAL[found] ?? found;
}

// ─── Garment demand builder ───────────────────────────────────────────
function buildGarmentInsights(trends: RichTrend[]): GarmentInsight[] {
  const allTerms = [
    ...trends.flatMap((t) => t.searchDemandMen   || []),
    ...trends.flatMap((t) => t.searchDemandWomen || []),
  ];

  const garmentMap = new Map<string, { score: number; fabricCounts: Record<string, number> }>();

  for (const term of allTerms) {
    if (!term?.trim()) continue;
    const garment = extractGarmentWord(term);
    if (!garment) continue;

    const entry = garmentMap.get(garment) ?? { score: 0, fabricCounts: {} };
    entry.score += 1;

    for (const fabric of FABRICS) {
      if (new RegExp(`\\b${fabric}\\b`, "i").test(term)) {
        entry.fabricCounts[fabric] = (entry.fabricCounts[fabric] ?? 0) + 1;
      }
    }

    garmentMap.set(garment, entry);
  }

  const sorted = [...garmentMap.entries()]
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 20);

  const max = sorted[0]?.[1].score || 1;

  return sorted.map(([garment, data], i) => ({
    rank: i + 1,
    garment,
    score: data.score,
    heatLevel: data.score >= max * 0.6 ? 3 : data.score >= max * 0.3 ? 2 : 1,
    fabrics: Object.entries(data.fabricCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([fabric, count]) => ({ fabric, count })),
  }));
}

// ─── Product matching (for terms tab) ────────────────────────────────
function matchProduct(
  query: string,
  gender: "men" | "women",
  products: ShopifyProduct[]
): ShopifyProduct | undefined {
  const garmentWord = extractGarmentWord(query);
  if (!garmentWord) return undefined;
  const root = garmentWord.replace(/s$/i, "");
  const pool = products.filter(
    (p) =>
      (p.gender === gender || p.gender === "unisex") &&
      new RegExp(`\\b${root}`, "i").test(p.title)
  );
  if (!pool.length) return undefined;
  const stop = new Set(["egypt","2026","men","women","man","woman","for","the","and","buy","shop","ladies","uk"]);
  const qWords = new Set(query.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !stop.has(w)));
  let best: ShopifyProduct | undefined;
  let bestScore = 0;
  for (const p of pool) {
    const overlap = p.title.toLowerCase().split(/\s+/).filter((w) => qWords.has(w)).length;
    if (overlap > bestScore) { bestScore = overlap; best = p; }
  }
  return best;
}

// ─── Demand list builder (for terms tab) ─────────────────────────────
const ENGLISH_OR_ARABIC = /^[؀-ۿa-zA-Z0-9\s\-'.,&]+$/;
const MEN_SIGNAL   = /\bfor men\b|\bmen's\b|\bmen s\b|\bmale\b/i;
const WOMEN_SIGNAL = /\bfor women\b|\bwomen's\b|\bwomen s\b|\bladies\b|\bfemale\b/i;
const NOISE = /\breview\b|\bcompar\b|\bvs\b|\bwikipedia\b|\bhistory\b|\borigin\b|\bmean\b/i;
const BEAUTY_NOISE = /\b(makeup|make-up|cosmetic|cosmetics|lipstick|lip stick|lip gloss|mascara|foundation|skincare|skin care|perfume|fragrance|haircut|hair color|nails?)\b/i;
const FOREIGN_DISPLAY = /\b(vestido|camisa|pantalon|para|hombre|mujer|roupas?|pour|homme|femme|moda|ropa|avec|vêtement)\b/i;
const GEO_JUNK_DISPLAY = /\b(uk|united kingdom|britain|american|europe|european)\s*$/i;
const COLD_DISPLAY = /\b(leather jacket|leather coat|wool coat|puffer|down jacket|winter coat|sweater|sweatshirt|hoodie|turtleneck|cashmere coat|fleece|thermal)\b/i;
function fuzzyKeyDisplay(s: string): string {
  return s.toLowerCase().replace(/\b(de|em|le|la|les|el|los|for|in|with|the|a|an|and|or)\b/g, " ").replace(/\s+/g, " ").trim();
}

function buildDemandList(
  trends: RichTrend[],
  gender: "men" | "women",
  products: ShopifyProduct[]
): DemandTerm[] {
  const scoreMap = new Map<string, { score: number; order: number; garment: string }>();
  const fuzzySet = new Set<string>();
  let order = 0;
  const opposite = gender === "men" ? WOMEN_SIGNAL : MEN_SIGNAL;

  for (const trend of trends) {
    const terms = gender === "men" ? (trend.searchDemandMen || []) : (trend.searchDemandWomen || []);
    terms.forEach((phrase, pos) => {
      const t = phrase?.trim();
      if (!t || t.length < 8) return;
      if (!ENGLISH_OR_ARABIC.test(t)) return;
      if (opposite.test(t)) return;
      if (NOISE.test(t)) return;
      if (BEAUTY_NOISE.test(t)) return;
      if (FOREIGN_DISPLAY.test(t)) return;   // drop Portuguese/Spanish/French
      if (GEO_JUNK_DISPLAY.test(t)) return;  // drop "...uk" etc.
      if (COLD_DISPLAY.test(t)) return;       // drop cold-weather items
      const fkey = fuzzyKeyDisplay(t);
      if (fuzzySet.has(fkey)) return;        // fuzzy dedup
      fuzzySet.add(fkey);
      const key = t.toLowerCase();
      const w = 1 / (pos + 1);
      const cur = scoreMap.get(key);
      if (cur) cur.score += w;
      else scoreMap.set(key, { score: w, order: order++, garment: trend.name });
    });
  }

  const sorted = [...scoreMap.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 10);

  const max = sorted[0]?.score || 1;
  return sorted.map((t, i) => ({
    rank: i + 1,
    query: t.key,
    score: Math.round(t.score * 100) / 100,
    heatLevel: t.score >= max * 0.6 ? 3 : t.score >= max * 0.3 ? 2 : 1,
    sourceGarment: t.garment,
    matchedProduct: matchProduct(t.key, gender, products),
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────
function Heat({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="flex items-center gap-0.5 flex-shrink-0">
      {[1, 2, 3].map((n) => (
        <Flame key={n} className={cn("w-3 h-3", n <= level ? "text-orange-400" : "text-surface-2")} />
      ))}
    </span>
  );
}

function GarmentRow({ item }: { item: GarmentInsight }) {
  const [open, setOpen] = useState(false);
  const hasFabrics = item.fabrics.length > 0;
  const maxFabric = item.fabrics[0]?.count || 1;

  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => hasFabrics && setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-3 py-2.5 text-left",
          hasFabrics && "cursor-pointer"
        )}
      >
        <span className="text-[11px] font-bold text-muted w-5 flex-shrink-0">#{item.rank}</span>
        <span className="flex-1 text-xs font-semibold text-foreground capitalize">{item.garment}</span>
        <span className="text-[10px] text-muted mr-2">{item.score} searches</span>
        <Heat level={item.heatLevel} />
        {hasFabrics && (
          <ChevronDown
            className={cn("w-3 h-3 text-muted ml-1 transition-transform", open && "rotate-180")}
          />
        )}
      </button>

      {open && hasFabrics && (
        <div className="pb-3 pl-8 space-y-1.5">
          {item.fabrics.map((f) => (
            <div key={f.fabric} className="flex items-center gap-3">
              <span className="text-[10px] text-foreground-muted w-16 capitalize">{f.fabric}</span>
              <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-400"
                  style={{ width: `${Math.round((f.count / maxFabric) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted w-4 text-right">{f.count}</span>
            </div>
          ))}
          <p className="text-[9px] text-muted mt-1">
            tap to hide · fabric mentions within "{item.garment}" searches
          </p>
        </div>
      )}
    </div>
  );
}

function DemandRow({ term, gender }: { term: DemandTerm; gender: "men" | "women" }) {
  const p = term.matchedProduct;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] font-bold text-muted w-5 flex-shrink-0 pt-0.5">#{term.rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-snug">{term.query}</p>
        <p className="text-[9px] text-muted mt-0.5">via {term.sourceGarment}</p>
        {p && (
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mt-2 group bg-surface-2 rounded-lg p-1.5 hover:bg-surface transition-colors"
          >
            <img src={p.image} alt={p.title} className="w-8 h-8 rounded object-cover flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-blue-400 group-hover:text-blue-300 truncate leading-tight">{p.title}</p>
              <p className="text-[9px] text-muted">EGP {p.price} · {gender === "men" ? "Men's" : "Women's"}</p>
            </div>
          </a>
        )}
      </div>
      <Heat level={term.heatLevel} />
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────
interface Props {
  trends: RichTrend[];
}

export function SearchDemandSection({ trends }: Props) {
  const [tab, setTab] = useState<"garments" | "men" | "women">("garments");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);

  useEffect(() => {
    fetch("/api/products?bestsellers=true")
      .then((r) => r.json())
      .then((d: { products?: any[] }) => {
        const tagged: ShopifyProduct[] = (d.products || []).map((p) => ({
          title: p.title,
          image: p.image,
          url: p.url,
          price: p.price,
          type: p.type,
          gender: detectProductGender(p.title, p.type),
        }));
        setProducts(tagged);
      })
      .catch(() => {});
  }, []);

  const garmentInsights = useMemo(() => buildGarmentInsights(trends), [trends]);
  const menList   = useMemo(() => buildDemandList(trends, "men",   products), [trends, products]);
  const womenList = useMemo(() => buildDemandList(trends, "women", products), [trends, products]);

  const hasData = trends.some(
    (t) => (t.searchDemandMen?.length || 0) + (t.searchDemandWomen?.length || 0) > 0
  );
  const totalSignals = trends.flatMap((t) => [
    ...(t.searchDemandMen || []),
    ...(t.searchDemandWomen || []),
  ]).length;

  return (
    <div className="bg-surface border border-blue-400/20 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
        <Search className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">🔍 What Customers Are Searching</p>
          <p className="text-[10px] text-muted mt-0.5">
            Real Google autocomplete · {totalSignals} signals across {trends.length} trends
          </p>
        </div>
      </div>

      <div className="p-5">
        {!hasData && (
          <div className="text-center py-8">
            <Search className="w-8 h-8 text-blue-400 mx-auto mb-3 opacity-40" />
            <p className="text-sm text-foreground-muted mb-1">No search data yet</p>
            <p className="text-xs text-muted">Generate trends above — search demand loads automatically</p>
          </div>
        )}

        {hasData && (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-4">
              {(["garments", "men", "women"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    tab === t ? "bg-blue-400 text-black" : "bg-surface-2 text-foreground-muted hover:text-foreground"
                  )}
                >
                  {t === "garments" ? "📊 Garment Demand" : t === "men" ? "👔 Men · Top 10" : "👗 Women · Top 10"}
                </button>
              ))}
              <span className="text-[9px] text-muted ml-auto">{totalSignals} signals</span>
            </div>

            {/* Garment demand tab */}
            {tab === "garments" && (
              <div>
                <p className="text-[10px] text-muted mb-3">
                  Top garment types by search frequency · tap any row to see fabric breakdown
                </p>
                {garmentInsights.length === 0 ? (
                  <p className="text-xs text-muted text-center py-4">No garment signals extracted yet</p>
                ) : (
                  garmentInsights.map((item) => <GarmentRow key={item.garment} item={item} />)
                )}
              </div>
            )}

            {/* Men / Women search terms + matched products */}
            {(tab === "men" || tab === "women") && (
              <div>
                {(tab === "men" ? menList : womenList).map((term) => (
                  <DemandRow key={term.rank} term={term} gender={tab} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
