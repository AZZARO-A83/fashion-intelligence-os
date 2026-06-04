"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { ImageReference } from "@/types";
import { Sources, type Source } from "@/components/ui/sources";
import { GenerationError } from "@/components/ui/generation-error";
import { Palette, Tag, Info, RefreshCw, Sparkles } from "lucide-react";

interface MoodBoard {
  title: string;
  description: string;
  colors: string[];
  mood: string;
  useFor: string;
}

interface ShopProduct {
  title: string;
  image: string;
  price: string;
  type: string;
  url: string;
}

// Curated Unsplash images for Egyptian fashion campaigns
const IMAGE_LIBRARY: (ImageReference & { id: string; campaignHint: string })[] = [
  {
    id: "i1",
    url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80",
    category: "mood",
    reason: "Minimal linen styling — high relevance to current Old Money trend",
    tags: ["linen", "minimal", "summer", "old-money", "clean"],
    style: "Minimal Linen Outfit",
    campaignHint: "Cairo Summer Essentials",
  },
  {
    id: "i2",
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
    category: "styling",
    reason: "Co-ord set aesthetic performing strongly on Egyptian Instagram",
    tags: ["co-ord", "women", "summer", "matching-set", "lifestyle"],
    style: "Summer Co-ord Lifestyle",
    campaignHint: "Co-ord Queen",
  },
  {
    id: "i3",
    url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
    category: "mood",
    reason: "Shopping energy — works for flash sale and Black Friday campaigns",
    tags: ["shopping", "lifestyle", "urban", "energetic"],
    style: "Urban Shopping Mood",
    campaignHint: "Black Friday",
  },
  {
    id: "i4",
    url: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&q=80",
    category: "styling",
    reason: "Smart casual urban styling growing fast on Egyptian TikTok — work to weekend versatility",
    tags: ["smart-casual", "urban", "semi-formal", "men", "cairo-vibe"],
    style: "Cairo Smart Casual",
    campaignHint: "Cairo Smart Casual",
  },
  {
    id: "i5",
    url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
    category: "ad",
    reason: "Elegant modest fashion reference — strong Ramadan/Eid campaign visual",
    tags: ["elegant", "modest", "eid", "ramadan", "formal"],
    style: "Elegant Modest Fashion",
    campaignHint: "Eid Collection",
  },
  {
    id: "i6",
    url: "https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=800&q=80",
    category: "color",
    reason: "Pastel color palette — trending soft girl aesthetic on Instagram",
    tags: ["pastel", "soft", "feminine", "aesthetic", "color-palette"],
    style: "Soft Pastel Palette",
    campaignHint: "Soft Girl Summer",
  },
  {
    id: "i7",
    url: "https://images.unsplash.com/photo-1562137369-1a1a0bc66744?w=800&q=80",
    category: "product",
    reason: "Clean product photography — high conversion rate for e-commerce",
    tags: ["product-shot", "clean", "minimal", "white-background"],
    style: "Clean Product Shot",
    campaignHint: "Product Launch",
  },
  {
    id: "i8",
    url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
    category: "content",
    reason: "Beach/coastal lifestyle — North Coast summer season campaign",
    tags: ["beach", "coastal", "summer", "north-coast", "lifestyle"],
    style: "North Coast Lifestyle",
    campaignHint: "Beach Season",
  },
  {
    id: "i9",
    url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
    category: "mood",
    reason: "Wedding guest attire — strong for spring wedding season",
    tags: ["wedding", "formal", "guest", "elegant", "event"],
    style: "Wedding Guest Elegance",
    campaignHint: "Wedding Season",
  },
  {
    id: "i10",
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    category: "styling",
    reason: "Back to school/ university styling — targeting 18-24 segment",
    tags: ["university", "campus", "casual", "students", "everyday"],
    style: "Campus Casual",
    campaignHint: "Back to School",
  },
  {
    id: "i11",
    url: "https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=800&q=80",
    category: "ad",
    reason: "Men's smart casual — strong for office and corporate Egyptian market",
    tags: ["men", "smart-casual", "corporate", "office", "tailored"],
    style: "Smart Casual Men",
    campaignHint: "Corporate Collection",
  },
  {
    id: "i12",
    url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
    category: "mood",
    reason: "Luxury fashion mood board — aspirational positioning for premium pieces",
    tags: ["luxury", "aspirational", "premium", "editorial", "fashion"],
    style: "Luxury Editorial",
    campaignHint: "Premium Collection",
  },
];

const CATEGORIES = ["all", "mood", "styling", "ad", "product", "content", "color"];

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  mood: "Mood Board",
  styling: "Styling",
  ad: "Ad Reference",
  product: "Product",
  content: "Content Layout",
  color: "Color Palette",
};

const COLOR_PALETTES = [
  { name: "Old Money Summer", colors: ["#F5F0E8", "#D4C5A9", "#8B7355", "#4A3728", "#1C1008"] },
  { name: "Cairo Sunset", colors: ["#FF6B35", "#F7931E", "#FFD700", "#FF8C42", "#C84B31"] },
  { name: "Ramadan Gold", colors: ["#DAA520", "#B8860B", "#8B6914", "#4B3A1F", "#1A1208"] },
  { name: "Coastal Fresh", colors: ["#A8D8EA", "#AA96DA", "#FCBAD3", "#FFFFD2", "#B8DFD8"] },
  { name: "Cairo Nights", colors: ["#0F0E17", "#1B1B2F", "#2D2D44", "#E53170", "#FF8906"] },
  { name: "Soft Girl", colors: ["#FFD6E0", "#FFAFCC", "#BDE0FE", "#A2D2FF", "#CDB4DB"] },
];

function ImageCard({ img, onClick }: { img: typeof IMAGE_LIBRARY[0]; onClick: () => void }) {
  return (
    <div
      className="group relative bg-surface border border-border/50 rounded-xl overflow-hidden cursor-pointer hover:border-border transition-all"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt={img.style}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
        <div className="absolute top-2 right-2">
          <Badge variant="default">{CATEGORY_LABELS[img.category]}</Badge>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-foreground">{img.style}</p>
        <p className="text-[10px] text-muted mt-0.5 leading-relaxed">{img.reason}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {img.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[9px] bg-surface-2 text-foreground-muted px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <span className="text-[9px] text-accent">→ {img.campaignHint}</span>
        </div>
      </div>
    </div>
  );
}

function ImageModal({ img, onClose }: { img: typeof IMAGE_LIBRARY[0]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl overflow-hidden max-w-3xl w-full flex"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex-1 min-h-[400px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={img.style} className="w-full h-full object-cover" />
        </div>
        <div className="w-72 p-6 flex flex-col gap-4">
          <div>
            <Badge variant="info">{CATEGORY_LABELS[img.category]}</Badge>
            <h3 className="text-base font-semibold text-foreground mt-2">{img.style}</h3>
            <p className="text-xs text-muted mt-1">Campaign: {img.campaignHint}</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="w-3 h-3 text-muted" />
              <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Reason</p>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">{img.reason}</p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="w-3 h-3 text-muted" />
              <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Style Tags</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {img.tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-surface-2 text-foreground-muted border border-border px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigator.clipboard.writeText(img.url)}
            className="mt-auto bg-accent text-black py-2 rounded-lg text-xs font-bold hover:bg-accent-light transition-colors"
          >
            Copy Image URL
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InspirationPage() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<typeof IMAGE_LIBRARY[0] | null>(null);
  const [search, setSearch] = useState("");

  // Live mood boards (real colors + direction from live trends + sources)
  const [boards, setBoards] = useState<MoodBoard[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inspiration")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? []);
        if (d.boards?.length) { setBoards(d.boards); setSources(d.sources ?? []); setGeneratedAt(d.generatedAt); }
      })
      .catch(() => {});
  }, []);

  const generateBoards = async () => {
    setGenLoading(true);
    setGenError(null);
    try {
      const res = await fetch("/api/inspiration", { method: "POST" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Generation failed: ${e.details || res.status}`); }
      const d = await res.json();
      setBoards(d.boards); setSources(d.sources ?? []); setGeneratedAt(d.generatedAt);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenLoading(false);
    }
  };

  const filtered = IMAGE_LIBRARY.filter((img) => {
    const matchesFilter = filter === "all" || img.category === filter;
    const matchesSearch = !search || img.tags.some((t) => t.includes(search.toLowerCase())) || img.style.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Visual Inspiration Library"
        subtitle="Live mood boards from current trends + a curated reference library"
        badge="🟢 Live boards"
        action={
          <button
            onClick={generateBoards}
            disabled={genLoading}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${genLoading ? "animate-spin" : ""}`} />
            {genLoading ? "Creating live…" : boards.length ? "Refresh boards" : "Generate live boards"}
          </button>
        }
      />

      <div className="p-8 space-y-6">

        {/* LIVE Mood Boards */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Live Mood Boards</h2>
            {generatedAt && <span className="text-xs text-muted">· {timeAgo(generatedAt)}</span>}
          </div>

          {genError && <GenerationError error={genError} />}

          {!boards.length && !genLoading && !genError && (
            <div className="bg-surface border border-dashed border-border rounded-xl p-8 text-center">
              <Palette className="w-10 h-10 text-accent mx-auto mb-3 opacity-50" />
              <p className="text-sm text-foreground font-medium mb-1">No live boards yet</p>
              <p className="text-xs text-muted">Click <strong>Generate live boards</strong> — AI builds mood boards from current trends, with sources.</p>
            </div>
          )}

          {genLoading && (
            <div className="bg-surface border border-border rounded-xl p-8 text-center">
              <RefreshCw className="w-5 h-5 text-accent animate-spin mx-auto mb-2" />
              <p className="text-sm text-foreground">Searching live trends &amp; building boards…</p>
            </div>
          )}

          {boards.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {boards.map((b, i) => (
                  <div key={i} className="bg-surface border border-border/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-foreground">{b.title}</h3>
                      <span className="text-[10px] text-muted">{b.mood}</span>
                    </div>
                    <div className="flex rounded-lg overflow-hidden h-9 mb-3">
                      {b.colors.map((c, j) => (
                        <div key={j} className="flex-1 hover:flex-[2] transition-all" style={{ backgroundColor: c }} title={c} />
                      ))}
                    </div>
                    <p className="text-xs text-foreground-muted leading-relaxed mb-2">{b.description}</p>
                    <p className="text-[10px] text-accent">For: {b.useFor}</p>
                  </div>
                ))}
              </div>
              <Sources sources={sources} />
            </>
          )}
        </div>

        {/* Real Debackers products — live from Shopify */}
        {products.length > 0 && (
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-foreground">Your Real Products</h2>
              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">🟢 LIVE from Shopify</span>
            </div>
            <p className="text-xs text-muted mb-4">Real Debackers photos — use these in content, pair them with the mood boards above.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {products.map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noreferrer" className="group">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface-2 border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  </div>
                  <p className="text-[11px] text-foreground mt-1.5 truncate group-hover:text-accent">{p.title}</p>
                  <p className="text-[10px] text-muted">{p.type} · EGP {parseFloat(p.price || "0").toLocaleString("en-EG")}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Color Palettes */}
        <div className="bg-surface border border-border/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Campaign Color Palettes</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {COLOR_PALETTES.map((palette) => (
              <div key={palette.name}>
                <p className="text-xs font-medium text-foreground mb-2">{palette.name}</p>
                <div className="flex rounded-lg overflow-hidden h-8">
                  {palette.colors.map((color) => (
                    <div
                      key={color}
                      className="flex-1 cursor-pointer hover:flex-[2] transition-all duration-200"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                  filter === cat
                    ? "bg-accent text-black"
                    : "bg-surface-2 text-foreground-muted hover:text-foreground"
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by style or tag..."
            className="ml-auto bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder-muted focus:outline-none focus:border-accent transition-colors w-48"
          />
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-4 gap-4">
          {filtered.map((img) => (
            <ImageCard key={img.id} img={img} onClick={() => setSelected(img)} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted text-sm">No images match your search</p>
          </div>
        )}

      </div>

      {selected && <ImageModal img={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
