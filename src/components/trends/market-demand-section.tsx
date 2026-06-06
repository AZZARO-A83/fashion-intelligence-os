"use client";

import { useState, useEffect } from "react";
import { BarChart3, ChevronDown, RefreshCw, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GarmentDemand, MarketDemandResult } from "@/app/api/market-demand/route";

function Heat({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="flex items-center gap-0.5 flex-shrink-0">
      {[1, 2, 3].map((n) => (
        <Flame key={n} className={cn("w-3 h-3", n <= level ? "text-orange-400" : "text-surface-2")} />
      ))}
    </span>
  );
}

function GarmentRow({ item, rank }: { item: GarmentDemand; rank: number }) {
  const [open, setOpen] = useState(false);
  const maxFabric = item.fabrics[0]?.count || 1;

  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 py-2.5 text-left"
      >
        <span className="text-[11px] font-bold text-muted w-5 flex-shrink-0">#{rank}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground capitalize">{item.label}</span>
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
              item.gender === "men" ? "bg-blue-400/10 text-blue-400" :
              item.gender === "women" ? "bg-pink-400/10 text-pink-400" :
              "bg-purple-400/10 text-purple-400"
            )}>
              {item.gender}
            </span>
            {item.inCatalog ? (
              <span className="text-[9px] bg-green-400/10 text-green-400 border border-green-400/20 px-1.5 py-0.5 rounded-full">✓ in catalog</span>
            ) : (
              <span className="text-[9px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded-full">⚡ opportunity</span>
            )}
          </div>
          <p className="text-[9px] text-muted mt-0.5">{item.score} search signals</p>
        </div>

        <Heat level={item.heatLevel} />
        <ChevronDown className={cn("w-3 h-3 text-muted ml-1 transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="pb-3 pl-8 space-y-3">
          {/* Top searches */}
          {item.topSearches.length > 0 && (
            <div>
              <p className="text-[9px] text-muted uppercase tracking-wider mb-1.5">What people type</p>
              <div className="flex flex-wrap gap-1">
                {item.topSearches.map((s) => (
                  <span key={s} className="text-[10px] bg-surface-2 text-foreground-muted px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Fabric breakdown */}
          {item.fabrics.length > 0 && (
            <div>
              <p className="text-[9px] text-muted uppercase tracking-wider mb-1.5">Fabric demand</p>
              <div className="space-y-1">
                {item.fabrics.map((f) => (
                  <div key={f.fabric} className="flex items-center gap-3">
                    <span className="text-[10px] text-foreground-muted w-16 capitalize">{f.fabric}</span>
                    <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-400"
                        style={{ width: `${Math.round((f.count / maxFabric) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted w-4 text-right">{f.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!item.inCatalog && (
            <p className="text-[9px] text-amber-400/80 bg-amber-400/5 border border-amber-400/10 rounded px-2 py-1">
              ⚡ Not in Debackers catalog — high demand signal, potential product opportunity
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function MarketDemandSection() {
  const [data, setData] = useState<MarketDemandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "men" | "women" | "gaps">("all");

  useEffect(() => {
    fetch("/api/market-demand")
      .then((r) => r.json())
      .then((d: MarketDemandResult) => { if (d.garments?.length) setData(d); })
      .catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market-demand", { method: "POST" });
      const d: MarketDemandResult = await res.json();
      if (d.garments?.length) setData(d);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const filtered = (data?.garments || []).filter((g) => {
    if (tab === "men")   return g.gender === "men" || g.gender === "both";
    if (tab === "women") return g.gender === "women" || g.gender === "both";
    if (tab === "gaps")  return !g.inCatalog;
    return true;
  });

  const gapCount = (data?.garments || []).filter((g) => !g.inCatalog).length;

  return (
    <div className="bg-surface border border-amber-400/20 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">📊 What the Market Wants</p>
            <p className="text-[10px] text-muted mt-0.5">
              Pure consumer search · independent of Debackers catalog · Google autocomplete signals
            </p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-black rounded-lg text-xs font-bold hover:bg-amber-300 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          {loading ? "Scanning…" : data ? "Refresh" : "Scan Market"}
        </button>
      </div>

      <div className="p-5">
        {!data && !loading && (
          <div className="text-center py-8">
            <BarChart3 className="w-8 h-8 text-amber-400 mx-auto mb-3 opacity-40" />
            <p className="text-sm text-foreground-muted mb-1">No market data yet</p>
            <p className="text-xs text-muted mb-4">
              Scans Google autocomplete for every garment type — shows what consumers demand,
              what fabrics they want, and which gaps Debackers hasn&apos;t filled.
            </p>
            <button
              onClick={generate}
              disabled={loading}
              className="px-4 py-2 bg-amber-400 text-black rounded-lg text-sm font-bold hover:bg-amber-300 disabled:opacity-50 transition-colors"
            >
              {loading ? "Scanning market…" : "Scan Market Now"}
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-foreground">Querying Google autocomplete…</p>
            <p className="text-xs text-muted mt-1">~10 seconds · free · no tokens</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-surface-2 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">{data.garments.length}</p>
                <p className="text-[10px] text-muted">garment types</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-green-400">{data.garments.length - gapCount}</p>
                <p className="text-[10px] text-muted">in catalog</p>
              </div>
              <div className="bg-amber-400/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-amber-400">{gapCount}</p>
                <p className="text-[10px] text-muted">opportunities</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {(["all", "men", "women", "gaps"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize",
                    tab === t ? "bg-amber-400 text-black" : "bg-surface-2 text-foreground-muted hover:text-foreground"
                  )}
                >
                  {t === "gaps" ? `⚡ Gaps (${gapCount})` : t === "all" ? "All" : t === "men" ? "👔 Men" : "👗 Women"}
                </button>
              ))}
              <span className="text-[9px] text-muted ml-auto">{data.totalSignals} total signals</span>
            </div>

            {/* Garment list */}
            <div>
              {filtered.map((g, i) => (
                <GarmentRow key={g.id} item={g} rank={i + 1} />
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted text-center py-4">No items in this filter</p>
              )}
            </div>

            <p className="text-[9px] text-muted mt-3 text-center">
              Data from Google autocomplete · refreshes every 24h · tap any row for search terms + fabric breakdown
            </p>
          </>
        )}
      </div>
    </div>
  );
}
