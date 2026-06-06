"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { Badge } from "@/components/ui/badge";
import { RichTrend, TrendSignal } from "@/lib/trend-engine";
import { GenerationError } from "@/components/ui/generation-error";
import { Sources, type Source } from "@/components/ui/sources";
import { cn, platformIcon, platformColor, timeAgo } from "@/lib/utils";
import {
  TrendingUp, Clock, Hash, Music, ChevronDown, ChevronRight,
  AlertCircle, BarChart3, ShoppingBag, Users, Zap, Filter, RefreshCw,
} from "lucide-react";

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

function SignalBar({ signal }: { signal: TrendSignal }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-24 text-[9px] text-muted text-right pt-0.5">{signal.source}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", signal.direction === "up" ? "bg-green-400" : signal.direction === "down" ? "bg-red-400" : "bg-zinc-400")}
              style={{ width: `${signal.weight}%` }}
            />
          </div>
          <span className="text-[9px] text-muted w-8 text-right">{signal.weight}%</span>
        </div>
        <p className="text-[10px] text-foreground-muted leading-snug">{signal.metric}: <span className="text-foreground">{signal.value}</span></p>
      </div>
    </div>
  );
}

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
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize", platformColor(trend.platform))}>
                {platformIcon(trend.platform)} {trend.platform}
              </span>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold", URGENCY_STYLES[trend.catalogMatch.urgency])}>
                {URGENCY_LABELS[trend.catalogMatch.urgency]}
              </span>
              <span className="text-[10px] text-muted">
                Peaks in <strong className="text-foreground">{trend.expectedPeakDays}</strong> days
              </span>
            </div>

            <p className="text-xs text-foreground-muted">{trend.description}</p>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs font-bold text-green-400">+{trend.growthRate}%</p>
              <p className="text-[9px] text-muted">weekly growth</p>
            </div>
            {expanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-border p-5 space-y-5 animate-fade-in">

          {/* Score Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-3.5 h-3.5 text-accent" />
              <p className="text-xs font-bold text-foreground">How Score {trend.trendScore}/100 Was Calculated</p>
            </div>
            <div className="space-y-3 bg-surface-2 rounded-lg p-4">
              {trend.signals.map((signal, i) => (
                <SignalBar key={i} signal={signal} />
              ))}
              <div className="pt-2 border-t border-border mt-2">
                <p className="text-[10px] text-muted">
                  Score = weighted average of {trend.signals.length} signals.
                  Confidence: <strong className="text-foreground">{trend.confidenceScore}%</strong> ·
                  Survival past 30 days: <strong className="text-foreground">{trend.survivalRate}%</strong>
                </p>
              </div>
            </div>
          </div>

          {/* 3-column grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-2 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-accent">{trend.relevanceScore}/100</p>
              <p className="text-[10px] text-muted mt-0.5">Relevance to Debackers</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{trend.expectedPeakDays}d</p>
              <p className="text-[10px] text-muted mt-0.5">Until Peak</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{trend.survivalRate}%</p>
              <p className="text-[10px] text-muted mt-0.5">30-Day Survival</p>
            </div>
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

          {/* Competitor Reaction */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3 h-3 text-muted" />
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Competitor Reaction</p>
            </div>
            <div className="space-y-1.5">
              {[
                { name: "Tie House", reaction: trend.competitorReaction.tieHouse },
                { name: "British House", reaction: trend.competitorReaction.britishHouse },
                { name: "Massimo Dutti", reaction: trend.competitorReaction.massimoDutti },
              ].map(({ name, reaction }) => (
                <div key={name} className="flex gap-2 bg-surface-2 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold text-muted w-24 flex-shrink-0">{name}</span>
                  <p className="text-[10px] text-foreground-muted">{reaction}</p>
                </div>
              ))}
              <div className="flex gap-2 bg-green-400/5 border border-green-400/20 rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold text-green-400 w-24 flex-shrink-0">→ GAP</span>
                <p className="text-[10px] text-green-300">{trend.competitorReaction.gap}</p>
              </div>
            </div>
          </div>

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

          {/* Per-trend source — validate this trend */}
          {trend.evidenceUrl && (
            <a href={trend.evidenceUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-surface-2 border border-green-500/20 rounded-lg px-3 py-2 hover:border-accent/40 transition-colors group">
              <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider flex-shrink-0">📡 Source</span>
              <span className="text-[10px] text-foreground-muted truncate flex-1 group-hover:text-accent">{trend.evidenceTitle}</span>
              <span className="text-[9px] text-muted">verify →</span>
            </a>
          )}

          {/* LAYER 1 — TALKED ABOUT (content/awareness) */}
          <div className="bg-surface-2 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">🗣️ Talked about — Egypt evidence</p>
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
            {trend.signalsVerified && trend.signalsVerified.length > 0 && (
              <div className="space-y-1 mb-2">
                {trend.signalsVerified.map((s, i) => (
                  <p key={i} className="text-[10px] text-green-300 flex gap-1.5"><span className="text-green-400">✓</span>{s}</p>
                ))}
              </div>
            )}
            {trend.signalsMissing && trend.signalsMissing.length > 0 && (
              <div className="space-y-1">
                {trend.signalsMissing.map((s, i) => (
                  <p key={i} className="text-[10px] text-amber-300/80 flex gap-1.5"><span className="text-amber-400">⚠</span>{s}</p>
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
                <p className="text-[9px] text-muted mb-3">What real Egyptian consumers TYPE — colours, fabrics, clothing types. (Demand direction, not volume.)</p>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // Load the last live-generated trends + sources (shared, no tokens).
  useEffect(() => {
    fetch("/api/trends")
      .then((r) => r.json())
      .then((d) => {
        if (d.trends?.length) { setTrends(d.trends); setSources(d.sources ?? []); setGeneratedAt(d.generatedAt); }
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
      setTrends(d.trends);
      setSources(d.sources ?? []);
      setGeneratedAt(d.generatedAt);
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
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Researching live…" : trends.length ? "Refresh trends" : "Scan live trends"}
          </button>
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
              { icon: "📱", label: "Platform signals", desc: "TikTok + Instagram hashtag volume, growth rate, Egyptian creator activity" },
              { icon: "🛒", label: "Shopify sales data", desc: "Actual Debackers product sales correlated with trend activity" },
              { icon: "🔍", label: "Competitor reaction", desc: "Whether Tie House, British House, Massimo Dutti are already running this — gap = opportunity" },
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
                  {t.name} · {t.expectedPeakDays}d · score {t.trendScore}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
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

        {/* Trend Cards */}
        <div className="space-y-3">
          {filtered
            .sort((a, b) => b.trendScore - a.trendScore)
            .map((trend) => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
        </div>

      </div>
    </div>
  );
}
