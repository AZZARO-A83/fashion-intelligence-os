"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { Badge } from "@/components/ui/badge";
import { RichTrend, DemandMapRow, RejectedRow, BacklogRow } from "@/lib/trend-engine";
import { GenerationError } from "@/components/ui/generation-error";
import { Sources, type Source } from "@/components/ui/sources";
import { cn, timeAgo } from "@/lib/utils";
import {
  TrendingUp, ChevronDown, ChevronRight,
  AlertCircle, ShoppingBag, Zap, Filter, RefreshCw,
} from "lucide-react";
import { SearchDemandSection } from "@/components/trends/search-demand-section";
import { MarketDemandSection } from "@/components/trends/market-demand-section";
import { TrendGapAnalysis } from "@/components/trends/trend-gap-analysis";
import { SearchDemandMap } from "@/components/trends/search-demand-map";
import { RejectedBacklog } from "@/components/trends/rejected-backlog";
import { SearchCreditsPill } from "@/components/layout/search-credits-pill";

const URGENCY_STYLES = {
  "act-now": "bg-red-400/10 border-red-400/20 text-red-400",
  "prepare": "bg-amber-400/10 border-amber-400/20 text-amber-400",
  "monitor": "bg-zinc-400/10 border-zinc-400/20 text-zinc-400",
};

const URGENCY_LABELS = {
  "act-now": "⚡ Act Now",
  "prepare": "🕐 Prepare",
  "monitor": "👁 Monitor",
};


function TrendCard({ trend }: { trend: RichTrend }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "bg-surface border rounded-xl overflow-hidden transition-all",
      trend.catalogMatch.urgency === "act-now" ? "border-red-400/30" : "border-border/50"
    )}>

      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full p-5 text-left">
        <div className="flex items-start gap-4">
          <ScoreRing score={trend.trendScore} size="md" label="Score" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-bold text-foreground">{trend.name}</h3>
              {trend.arabicName && (
                <span className="text-xs text-muted font-arabic">{trend.arabicName}</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-2">
              {trend.gender && (
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize",
                  trend.gender === "men" ? "bg-sky-400/10 text-sky-300 border-sky-400/20" :
                  trend.gender === "women" ? "bg-pink-400/10 text-pink-300 border-pink-400/20" :
                  "bg-purple-400/10 text-purple-300 border-purple-400/20")}>
                  {trend.gender}
                </span>
              )}
              {trend.garmentType && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-surface-2 text-foreground-muted border-border font-medium capitalize">
                  {trend.garmentType}{trend.topFabric ? ` · ${trend.topFabric}` : ""}
                </span>
              )}
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold", URGENCY_STYLES[trend.catalogMatch.urgency])}>
                {URGENCY_LABELS[trend.catalogMatch.urgency]}
              </span>
              {trend.inCatalog ? (
                <span className="text-[9px] px-2 py-0.5 rounded-full border bg-green-400/10 text-green-400 border-green-400/20 font-bold">In catalog</span>
              ) : trend.opportunity ? (
                <span className="text-[9px] px-2 py-0.5 rounded-full border bg-amber-400/10 text-amber-400 border-amber-400/20 font-bold">Opportunity</span>
              ) : null}
              {trend.signalLayer === "both" && (
                <span className="text-[9px] px-2 py-0.5 rounded-full border bg-green-400/10 text-green-300 border-green-400/20 font-bold">✦ Search + Article</span>
              )}
            </div>

            <p className="text-xs text-foreground-muted">{trend.description}</p>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{trend.searchSignalCount ?? 0}</p>
              <p className="text-[9px] text-muted">search signals</p>
            </div>
            {expanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-border p-5 space-y-5 animate-fade-in">

          {/* Relevance */}
          <div className="bg-surface-2 rounded-lg p-3 flex items-center gap-3">
            <p className="text-lg font-bold text-accent">{trend.relevanceScore}/100</p>
            <p className="text-xs text-muted">Relevance to Debackers catalog · confidence <strong className="text-foreground">{trend.confidenceScore}%</strong></p>
          </div>

          {/* Historical Context */}
          {trend.historicalMatch && (
            <div className="bg-blue-400/5 border border-blue-400/20 rounded-lg p-3">
              <p className="text-[10px] font-bold text-blue-400 mb-1">📚 Historical Match</p>
              <p className="text-xs text-foreground-muted">{trend.historicalMatch}</p>
              {trend.lastYearOutcome && (
                <p className="text-xs text-blue-300 mt-1.5">→ {trend.lastYearOutcome}</p>
              )}
            </div>
          )}


          {/* Real Debackers products that match (live from Shopify) */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ShoppingBag className="w-3 h-3 text-muted" />
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Your Real Products That Match</p>
              <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">🟢 LIVE</span>
            </div>
            {trend.matchedProducts && trend.matchedProducts.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {trend.matchedProducts.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noreferrer" className="group">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-surface-2 border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                    <p className="text-[9px] text-foreground mt-1 truncate group-hover:text-accent">{p.title}</p>
                    <p className="text-[8px] text-muted">EGP {parseFloat(p.price || "0").toLocaleString("en-EG")}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted">No exact catalog match — consider sourcing for this trend.</p>
            )}
          </div>

          {/* Competitor Reaction — per trend */}
          {trend.competitorReaction && (
            <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-4">
              <p className="text-[10px] font-bold text-red-300 uppercase tracking-wider mb-3">🏁 Competitor Reaction to This Trend</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "Tie House", value: trend.competitorReaction.tieHouse },
                  { label: "British House", value: trend.competitorReaction.britishHouse },
                  { label: "Massimo Dutti", value: trend.competitorReaction.massimoDutti },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-2 rounded-lg p-2.5">
                    <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-[10px] text-foreground-muted leading-relaxed">{value || "—"}</p>
                  </div>
                ))}
              </div>
              {trend.competitorReaction.gap && (
                <div className="flex gap-2 bg-green-400/5 border border-green-400/20 rounded-lg px-3 py-2">
                  <span className="text-green-400 text-xs font-bold flex-shrink-0">→</span>
                  <p className="text-xs text-green-300 leading-relaxed"><strong className="text-green-400">Gap: </strong>{trend.competitorReaction.gap}</p>
                </div>
              )}
            </div>
          )}

          {/* Per-trend source — validate this trend */}
          {trend.evidenceUrl && (
            <a href={trend.evidenceUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-surface-2 border border-green-500/20 rounded-lg px-3 py-2 hover:border-accent/40 transition-colors group">
              <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider flex-shrink-0">📡 Source</span>
              <span className="text-[10px] text-foreground-muted truncate flex-1 group-hover:text-accent">{trend.evidenceTitle}</span>
              <span className="text-[9px] text-muted">verify →</span>
            </a>
          )}

          {/* LAYER 1 — INFLUENCE (what influencers are leading) */}
          <div className="bg-orange-400/5 border border-orange-400/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">🎙️ Influence Layer — What influencers are leading</p>
              {trend.evidenceStrength && (
                <span className={cn("text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase",
                  trend.evidenceStrength === "strong" ? "bg-green-400/10 text-green-400 border-green-400/20" :
                  trend.evidenceStrength === "medium" ? "bg-amber-400/10 text-amber-400 border-amber-400/20" :
                  "bg-zinc-400/10 text-zinc-400 border-zinc-400/20")}>
                  {trend.evidenceStrength} evidence
                </span>
              )}
              {trend.gender && <span className="text-[9px] text-muted capitalize">· {trend.gender}</span>}
            </div>
            {trend.signalsVerified && trend.signalsVerified.filter(s => !/^[ISLBislib]\d+$/.test(s.trim()) && s.trim().length > 3).length > 0 && (
              <div className="space-y-1 mb-2">
                {trend.signalsVerified.filter(s => !/^[ISLBislib]\d+$/.test(s.trim()) && s.trim().length > 3).map((s, i) => (
                  <p key={i} className="text-[10px] text-green-300 flex gap-1.5"><span className="text-green-400">✓</span>{s}</p>
                ))}
              </div>
            )}
            {trend.recommendedAction && (
              <p className="text-[10px] text-accent mt-2 font-medium">→ Recommended: {trend.recommendedAction}</p>
            )}
          </div>

          {/* LAYER 2 — SEARCHED ABOUT (real consumer demand) — Men | Women, top ~18 each */}
          {(() => {
            const men = trend.searchDemandMen ?? [];
            const women = trend.searchDemandWomen ?? [];
            const has = men.length > 0 || women.length > 0;
            return (
              <div className="bg-blue-400/5 border border-blue-400/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">🔍 Searched about — real demand</p>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">LIVE</span>
                </div>
                <p className="text-[9px] text-muted mb-3">What real Egyptian men and women TYPE into Google — colours, fabrics, clothing types. This is actual buying intent, independent of what influencers say.</p>
                {has ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-sky-300 mb-1.5">👔 Men · top {men.length}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {men.map((s, i) => (
                          <span key={i} className="text-[10px] bg-surface text-foreground-muted border border-border px-2 py-1 rounded-full">{s}</span>
                        ))}
                        {men.length === 0 && <span className="text-[10px] text-muted">—</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-pink-300 mb-1.5">👗 Women · top {women.length}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {women.map((s, i) => (
                          <span key={i} className="text-[10px] bg-surface text-foreground-muted border border-border px-2 py-1 rounded-full">{s}</span>
                        ))}
                        {women.length === 0 && <span className="text-[10px] text-muted">—</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-300/80">No live search demand returned for this term (engines may be blocked, or no Egypt searches found). Talked-about evidence above still applies.</p>
                )}
              </div>
            );
          })()}

          {/* Content Prescription */}
          <div className="bg-surface-2 rounded-lg p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="w-3 h-3 text-accent" />
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Content Prescription</p>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-[9px] text-muted mb-1">HOOK (Arabic)</p>
                <p className="text-sm text-foreground font-arabic bg-surface rounded-lg px-3 py-2">{trend.contentPrescription.hook}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] text-muted mb-1">FORMATS</p>
                  <div className="flex flex-wrap gap-1">
                    {trend.contentPrescription.format.map((f) => (
                      <span key={f} className="text-[9px] bg-surface text-foreground-muted px-2 py-0.5 rounded-full capitalize">{f}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] text-muted mb-1">BEST TIME</p>
                  <p className="text-[10px] text-foreground">{trend.contentPrescription.bestTime}</p>
                </div>
              </div>

              {trend.contentPrescription.sounds && (
                <div>
                  <p className="text-[9px] text-muted mb-1">🎵 SOUNDS</p>
                  <div className="flex flex-wrap gap-1">
                    {trend.contentPrescription.sounds.map((s) => (
                      <span key={s} className="text-[9px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[9px] text-muted mb-1">HASHTAGS</p>
                <div className="flex flex-wrap gap-1">
                  {trend.contentPrescription.hashtags.map((h) => (
                    <span key={h} className="text-[9px] bg-surface text-foreground-muted px-1.5 py-0.5 rounded-full">{h}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function TrendsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [trends, setTrends] = useState<RichTrend[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [demandMap, setDemandMap] = useState<DemandMapRow[]>([]);
  const [rejected, setRejected] = useState<RejectedRow[]>([]);
  const [backlog, setBacklog] = useState<BacklogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // Load the last live-generated trends + sources (shared, no tokens).
  useEffect(() => {
    fetch("/api/trends")
      .then((r) => r.json())
      .then((d) => {
        if (d.trends?.length || d.demandMap?.length) {
          setTrends(d.trends ?? []);
          setSources(d.sources ?? []);
          setDemandMap(d.demandMap ?? []);
          setRejected(d.rejected ?? []);
          setBacklog(d.backlog ?? []);
          setGeneratedAt(d.generatedAt);
        }
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trends", { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(`Generation failed: ${e.details || res.status}`);
      }
      const d = await res.json();
      setTrends(d.trends ?? []);
      setSources(d.sources ?? []);
      setDemandMap(d.demandMap ?? []);
      setRejected(d.rejected ?? []);
      setBacklog(d.backlog ?? []);
      setGeneratedAt(d.generatedAt);
      // Refresh just spent search credits — update the pill immediately.
      window.dispatchEvent(new Event("serper-usage-refresh"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const filters = ["all", "act-now", "prepare", "monitor"];
  const filtered = filter === "all"
    ? trends
    : trends.filter((t) => t.catalogMatch?.urgency === filter);

  const actNow = trends.filter((t) => t.catalogMatch?.urgency === "act-now");
  const avgScore = trends.length ? Math.round(trends.reduce((s, t) => s + t.trendScore, 0) / trends.length) : 0;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Trend Intelligence Engine"
        subtitle="Live web research — real Egyptian fashion trends right now"
        badge="🟢 Live"
        action={
          <div className="flex items-center gap-3">
            <SearchCreditsPill />
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Researching live…" : trends.length ? "Refresh trends" : "Scan live trends"}
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6">

        {generatedAt && (
          <p className="text-xs text-muted">🔄 Last scanned {timeAgo(generatedAt)} · live web search · shared with your team</p>
        )}

        {trends.length > 0 && <Sources sources={sources} />}

        {error && <GenerationError error={error} />}

        {!trends.length && !loading && !error && (
          <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center">
            <TrendingUp className="w-12 h-12 text-accent mx-auto mb-4 opacity-50" />
            <p className="text-foreground font-semibold mb-2">No trends scanned yet</p>
            <p className="text-sm text-muted mb-6">Click <strong>Scan live trends</strong> — AI searches the live web for what&apos;s trending in Egyptian fashion right now.</p>
          </div>
        )}

        {loading && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <RefreshCw className="w-6 h-6 text-accent animate-spin mx-auto mb-3" />
            <p className="text-foreground font-semibold">Searching live web for Egyptian fashion trends…</p>
          </div>
        )}

        {/* Stats */}
        {trends.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{trends.length}</p>
            <p className="text-xs text-muted mt-1">Trends Found</p>
          </div>
          <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{actNow.length}</p>
            <p className="text-xs text-muted mt-1">Act Now</p>
          </div>
          <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{avgScore}</p>
            <p className="text-xs text-muted mt-1">Avg Trend Score</p>
          </div>
          <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-accent">Live</p>
            <p className="text-xs text-muted mt-1">Web Search</p>
          </div>
        </div>
        )}

        {/* Methodology Note */}
        <div className="bg-surface border border-border/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-foreground mb-2">📊 How Trend Scores Are Calculated</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🔍", label: "Web search research", desc: "Live Serper search — Egyptian fashion articles, retailer activity, search result signals" },
              { icon: "🛒", label: "Search demand", desc: "Google, Bing, DuckDuckGo autocomplete — what Egyptian shoppers actually type (Arabic + English)" },
              { icon: "🤖", label: "AI analysis", desc: "Groq Llama 3.3 scores each trend for Egypt relevance, catalog fit, and timing" },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="bg-surface-2 rounded-lg p-3">
                <p className="text-xs font-semibold text-foreground mb-1">{icon} {label}</p>
                <p className="text-[10px] text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Act Now Alert */}
        {actNow.length > 0 && (
          <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-red-400">⚡ Act Now — Peaks in Under 2 Weeks</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {actNow.map((t) => (
                <span key={t.id} className="text-xs bg-red-400/10 text-red-400 border border-red-400/20 px-3 py-1 rounded-full">
                  {t.name} · score {t.trendScore}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search Demand Map — deterministic, before any AI trend */}
        {demandMap.length > 0 && <SearchDemandMap rows={demandMap} />}

        {/* Rejected & Winter Backlog — full transparency */}
        {(rejected.length > 0 || backlog.length > 0) && (
          <RejectedBacklog rejected={rejected} backlog={backlog} />
        )}

        {/* Filter */}
        {trends.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted" />
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                filter === f ? "bg-accent text-black" : "bg-surface-2 text-foreground-muted hover:text-foreground"
              )}
            >
              {f === "all" ? "All Trends" : f.replace("-", " ")}
            </button>
          ))}
        </div>
        )}

        {/* Trend Cards */}
        <div className="space-y-3">
          {filtered
            .sort((a, b) => b.trendScore - a.trendScore)
            .map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
        </div>

        {/* Trends vs Best Sellers — gap analysis */}
        {trends.length > 0 && <TrendGapAnalysis trends={trends} />}

        {/* Market Demand — pure consumer search, independent of Debackers */}
        <MarketDemandSection />

        {/* Search Demand — per-trend autocomplete signals with product matching */}
        {trends.length > 0 && <SearchDemandSection trends={trends} />}

      </div>
    </div>
  );
}
