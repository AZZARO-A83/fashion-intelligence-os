"use client";

import { useMemo, useEffect, useState } from "react";
import { Trophy, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RichTrend } from "@/lib/trend-engine";

interface BestSeller {
  title: string;
  image: string;
  url: string;
  price: string;
  grossSales?: number;
  ordersCount?: number;
}

type Status = "winning" | "compete" | "gap";

interface TrendMatch {
  trend: RichTrend;
  bestSellers: BestSeller[];
  status: Status;
}

// ─── Garment matching ─────────────────────────────────────────────────
const GARMENT_ROOTS = [
  "suit","blazer","jacket","coat","trouser","pant","chino","jeans","denim",
  "polo","shirt","tee","t-shirt","blouse","kaftan","abaya",
  "dress","skirt","jumpsuit","set","co-ord","cardigan","sweater","knit","pullover",
  "shorts","overall","vest",
];

function extractRoot(text: string): string | null {
  const t = text.toLowerCase();
  return GARMENT_ROOTS.find((r) => new RegExp(`\\b${r}`, "i").test(t)) ?? null;
}

function matchSellers(trend: RichTrend, sellers: BestSeller[]): BestSeller[] {
  const root = extractRoot(trend.name);
  if (!root) return [];
  return sellers.filter((s) =>
    new RegExp(`\\b${root}`, "i").test(s.title)
  );
}

// ─── Status chip ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  winning: {
    label: "Winning",
    icon: Trophy,
    bg: "bg-green-400/10",
    border: "border-green-400/20",
    text: "text-green-400",
    desc: "Trend is hot + you have best sellers in this category",
  },
  compete: {
    label: "Compete",
    icon: Target,
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    text: "text-blue-400",
    desc: "You carry this but it's not a top seller — push it harder",
  },
  gap: {
    label: "Gap",
    icon: Zap,
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    text: "text-amber-400",
    desc: "Trend is rising but you have nothing matching — opportunity",
  },
};

function StatusChip({ status }: { status: Status }) {
  const c = STATUS_CONFIG[status];
  const Icon = c.icon;
  return (
    <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", c.bg, c.border, c.text)}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function MatchRow({ match }: { match: TrendMatch }) {
  const c = STATUS_CONFIG[match.status];

  return (
    <div className={cn("rounded-xl border p-4", c.bg, c.border)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{match.trend.name}</p>
            <StatusChip status={match.status} />
          </div>
          <p className="text-[10px] text-muted mt-0.5">{c.desc}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn("text-lg font-bold", c.text)}>{match.trend.trendScore}</p>
          <p className="text-[9px] text-muted">trend score</p>
        </div>
      </div>

      {/* Matched best sellers */}
      {match.bestSellers.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {match.bestSellers.slice(0, 3).map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-surface rounded-lg px-2 py-1.5 hover:bg-surface-2 transition-colors"
            >
              {s.image && (
                <img src={s.image} alt={s.title} className="w-7 h-7 rounded object-cover flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-[10px] text-foreground truncate max-w-[120px]">{s.title}</p>
                {s.grossSales && (
                  <p className="text-[9px] text-muted">EGP {s.grossSales.toLocaleString()}</p>
                )}
              </div>
            </a>
          ))}
          {match.bestSellers.length > 3 && (
            <span className="text-[10px] text-muted self-center">+{match.bestSellers.length - 3} more</span>
          )}
        </div>
      )}

      {match.status === "gap" && (
        <p className="text-[10px] text-amber-400 mt-2">
          ⚡ {match.trend.name} is trending at score {match.trend.trendScore} — consider stocking or running a campaign for this garment type
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────
interface Props {
  trends: RichTrend[];
}

export function TrendGapAnalysis({ trends }: Props) {
  const [sellers, setSellers] = useState<BestSeller[]>([]);

  useEffect(() => {
    fetch("/api/products?bestsellers=true")
      .then((r) => r.json())
      .then((d: { products?: BestSeller[] }) => setSellers(d.products || []))
      .catch(() => {});
  }, []);

  const matches = useMemo((): TrendMatch[] => {
    return trends
      .sort((a, b) => b.trendScore - a.trendScore)
      .map((trend) => {
        const matched = matchSellers(trend, sellers);

        // Determine status
        let status: Status;
        if (matched.length > 0) {
          // Has best sellers in this garment type → Winning
          status = "winning";
        } else {
          // Check if trend's catalogMatch says they have products
          const hasInCatalog = trend.catalogMatch?.products?.length > 0;
          status = hasInCatalog ? "compete" : "gap";
        }

        return { trend, bestSellers: matched, status };
      });
  }, [trends, sellers]);

  if (!trends.length) return null;

  const winning  = matches.filter((m) => m.status === "winning");
  const compete  = matches.filter((m) => m.status === "compete");
  const gaps     = matches.filter((m) => m.status === "gap");

  return (
    <div className="bg-surface border border-border/50 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <p className="text-sm font-bold text-foreground">⚡ Trends vs Your Best Sellers</p>
        <p className="text-[10px] text-muted mt-0.5">
          60-day Shopify sales cross-referenced with current trend scores
        </p>
      </div>

      <div className="p-5 space-y-4">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-green-400">{winning.length}</p>
            <p className="text-[10px] text-muted">Winning</p>
          </div>
          <div className="bg-blue-400/10 border border-blue-400/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-400">{compete.length}</p>
            <p className="text-[10px] text-muted">Compete</p>
          </div>
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-amber-400">{gaps.length}</p>
            <p className="text-[10px] text-muted">Gaps</p>
          </div>
        </div>

        {/* Winning */}
        {winning.length > 0 && (
          <div>
            <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider mb-2">🏆 Already Winning</p>
            <div className="space-y-2">
              {winning.map((m) => <MatchRow key={m.trend.id} match={m} />)}
            </div>
          </div>
        )}

        {/* Compete */}
        {compete.length > 0 && (
          <div>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-2">🎯 Push Harder</p>
            <div className="space-y-2">
              {compete.map((m) => <MatchRow key={m.trend.id} match={m} />)}
            </div>
          </div>
        )}

        {/* Gaps */}
        {gaps.length > 0 && (
          <div>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2">⚡ Gaps — Act on These</p>
            <div className="space-y-2">
              {gaps.map((m) => <MatchRow key={m.trend.id} match={m} />)}
            </div>
          </div>
        )}

        <p className="text-[9px] text-muted text-center">
          Best sellers = last 60 days Shopify sales · trend scores from live web research
        </p>
      </div>
    </div>
  );
}
