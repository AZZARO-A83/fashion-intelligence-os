"use client";

import { useState } from "react";
import { LineChart, RefreshCw, AlertCircle } from "lucide-react";
import { MonthlyStrategy } from "@/types";

function DataBadge() {
  return <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">🔵 AI RESEARCH</span>;
}

export default function MonthlyStrategyPage() {
  const [strategy, setStrategy] = useState<MonthlyStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agency/monthly");
      if (!res.ok) throw new Error("Failed to generate monthly strategy");
      const data = await res.json();
      setStrategy(data.strategy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <LineChart className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Monthly Strategy</h1>
              <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold">MONTHLY</span>
              <DataBadge />
            </div>
            <p className="text-sm text-muted">Full market analysis, seasonal plan, campaign calendar, budget — For management</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Generating..." : strategy ? "Refresh" : "Generate Strategy"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!strategy && !loading && !error && (
        <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center">
          <LineChart className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
          <p className="text-foreground font-semibold mb-2">Monthly marketing strategy</p>
          <p className="text-sm text-muted mb-6">Full market analysis, campaign calendar, budget guidance, and KPI forecast for the month.</p>
          <button onClick={generate} className="px-6 py-3 bg-accent text-black rounded-lg font-semibold text-sm hover:bg-accent/90 transition-all">
            Generate Monthly Strategy
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <RefreshCw className="w-6 h-6 text-accent animate-spin" />
            <p className="text-foreground font-semibold">Building monthly strategy...</p>
          </div>
          <p className="text-sm text-muted">Deep market analysis in progress — this takes a moment</p>
        </div>
      )}

      {strategy && !loading && (
        <div className="space-y-6">
          {/* Meta */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap gap-4 text-xs text-muted">
            <span>Generated: {new Date(strategy.generatedAt).toLocaleString("en-EG")}</span>
            <span>Month: {strategy.month}</span>
          </div>

          {/* Executive Summary */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-foreground flex items-center gap-2"><span className="text-lg">📊</span> Executive Summary</h2>
              <DataBadge />
            </div>
            <p className="text-foreground-muted leading-relaxed">{strategy.executiveSummary}</p>
          </div>

          {/* Market Analysis */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-3"><span className="text-lg">🔍</span> Market Analysis</h2>
            <p className="text-foreground-muted leading-relaxed">{strategy.marketAnalysis}</p>
          </div>

          {/* Seasonal Strategy */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-3"><span className="text-lg">🌞</span> Seasonal Strategy</h2>
            <p className="text-foreground-muted leading-relaxed">{strategy.seasonalStrategy}</p>
          </div>

          {/* Campaign Calendar */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4"><span className="text-lg">📅</span> Campaign Calendar</h2>
            <div className="space-y-3">
              {strategy.campaignCalendar?.map((week, i) => (
                <div key={i} className="bg-surface-2 rounded-xl p-4 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-bold text-foreground">{week.week}</p>
                    <div className="flex gap-1">
                      {week.platforms?.map((p, j) => (
                        <span key={j} className="text-[10px] bg-surface text-muted px-1.5 py-0.5 rounded border border-border capitalize">{p}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-accent font-medium mb-2">{week.focus}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {week.campaigns?.map((c, j) => (
                      <span key={j} className="text-xs bg-surface text-foreground-muted px-2 py-1 rounded border border-border">{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget & Competitor Strategy */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-3"><span className="text-lg">💰</span> Budget Guidance</h2>
              <p className="text-sm text-foreground-muted leading-relaxed">{strategy.budgetRecommendation}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-3"><span className="text-lg">🎯</span> Competitor Strategy</h2>
              <p className="text-sm text-foreground-muted leading-relaxed">{strategy.competitorStrategy}</p>
            </div>
          </div>

          {/* KPI Forecast */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4"><span className="text-lg">📈</span> KPI Forecast</h2>
            <div className="grid grid-cols-2 gap-3">
              {strategy.kpiForecast?.map((kpi, i) => (
                <div key={i} className="bg-surface-2 rounded-xl p-4 border border-border">
                  <p className="text-xs text-muted mb-1">{kpi.metric}</p>
                  <p className="text-xl font-bold text-accent mb-1">{kpi.forecast}</p>
                  <p className="text-xs text-muted">{kpi.basis}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Meta Ads placeholder */}
          <div className="bg-surface border border-dashed border-purple-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">📱</span>
              <p className="text-sm font-bold text-foreground">Meta Ads Performance — Not Yet Connected</p>
            </div>
            <p className="text-xs text-muted">{strategy.metaAdsNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}
