"use client";

import { useState, useEffect } from "react";
import { CalendarRange, RefreshCw, Target, Users, CalendarDays } from "lucide-react";
import { WeeklyBrief } from "@/types";
import { HelpButton } from "@/components/ui/help-button";
import { GenerationError } from "@/components/ui/generation-error";
import { timeAgo } from "@/lib/utils";

function DataBadge() {
  return <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">🔵 AI RESEARCH</span>;
}

export default function WeeklyReportPage() {
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const [step, setStep] = useState<"idle"|"searching"|"generating">("idle");

  // Load the shared report the team already generated — no AI, no tokens.
  useEffect(() => {
    fetch("/api/agency/cached?type=weekly")
      .then((r) => r.json())
      .then((d) => {
        if (d.cached) {
          setBrief(d.cached);
          setCachedAt(d.generatedAt);
        }
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      setStep("searching");
      const researchRes = await fetch("/api/agency/research");
      if (!researchRes.ok) {
        const errData = await researchRes.json().catch(() => ({}));
        throw new Error(`Web search failed: ${errData.details || researchRes.status}`);
      }
      const research = await researchRes.json();

      setStep("generating");
      const res = await fetch("/api/agency/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ research }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Generation failed: ${errData.details || res.status}`);
      }
      const data = await res.json();
      setBrief(data.brief);
      setCachedAt(new Date().toISOString());
      setStep("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <CalendarRange className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Weekly Report</h1>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold">WEEKLY</span>
              <DataBadge />
              <HelpButton section="/agency/weekly" />
            </div>
            <p className="text-sm text-muted">Full week strategy, competitor watch, content plan, KPI targets — For management & marketing team</p>
            {cachedAt && <p className="text-xs text-muted mt-0.5">🔄 Last generated {timeAgo(cachedAt)} · shared with your whole team</p>}
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Generating..." : brief ? "Refresh" : "Generate Report"}
        </button>
      </div>

      {error && <GenerationError error={error} />}

      {!brief && !loading && !error && (
        <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center">
          <CalendarRange className="w-12 h-12 text-blue-400 mx-auto mb-4 opacity-50" />
          <p className="text-foreground font-semibold mb-2">Weekly marketing report</p>
          <p className="text-sm text-muted mb-6">Full strategy, competitor watch, content calendar and KPI targets for the week.</p>
          <button onClick={generate} className="px-6 py-3 bg-accent text-black rounded-lg font-semibold text-sm hover:bg-accent/90 transition-all">
            Generate Weekly Report
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <RefreshCw className="w-6 h-6 text-accent animate-spin" />
            <p className="text-foreground font-semibold">
              {step === "searching" ? "Step 1/2 — Searching the live web..." : "Step 2/2 — Building weekly strategy..."}
            </p>
          </div>
          <p className="text-sm text-muted">
            {step === "searching" ? "Scanning TikTok trends, competitor pages, influencers..." : "AI analyzing research and generating strategy..."}
          </p>
        </div>
      )}

      {brief && !loading && (
        <div className="space-y-6">
          {/* Meta */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap gap-4 text-xs text-muted">
            <span>Generated: {new Date(brief.generatedAt).toLocaleString("en-EG")}</span>
            <span>Week of: {brief.weekOf}</span>
          </div>

          {/* Executive Summary */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-foreground flex items-center gap-2"><span className="text-lg">📊</span> Executive Summary</h2>
              <DataBadge />
            </div>
            <p className="text-foreground-muted leading-relaxed">{brief.executiveSummary}</p>
          </div>

          {/* Top Opportunities */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-accent" /> Top Opportunities This Week</h2>
            <div className="space-y-2">
              {brief.topOpportunities?.map((opp, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                  <span className="text-accent font-bold text-sm flex-shrink-0 w-5">{i + 1}.</span>
                  <p className="text-sm text-foreground-muted">{opp}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Campaigns */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4"><span className="text-lg">⚡</span> Campaigns to Run This Week</h2>
            <div className="grid gap-4">
              {brief.campaigns?.map((c, i) => (
                <div key={i} className="bg-surface-2 rounded-xl p-4 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-foreground">{c.name}</h3>
                    <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded font-semibold">{c.confidence}% confidence</span>
                  </div>
                  <p className="text-xs text-muted mb-2">{c.audience} · {c.format} · {c.timing}</p>
                  <p className="text-xs text-foreground-muted mb-3">{c.objective}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface rounded p-2 border border-border">
                      <p className="text-[10px] text-muted mb-1">ARABIC</p>
                      <p className="text-xs text-foreground" dir="rtl">{c.hook_ar}</p>
                    </div>
                    <div className="bg-surface rounded p-2 border border-border">
                      <p className="text-[10px] text-muted mb-1">ENGLISH</p>
                      <p className="text-xs text-foreground">{c.hook_en}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor Watch */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-accent" /> Competitor Watch</h2>
            <div className="space-y-3">
              {brief.competitorWatch?.map((move, i) => (
                <div key={i} className="bg-surface-2 rounded-xl p-4 border border-border">
                  <p className="text-sm font-bold text-foreground mb-1">{move.competitor}</p>
                  <p className="text-xs text-muted mb-1">{move.observation}</p>
                  <p className="text-xs text-yellow-400">Gap: {move.gap}</p>
                  <p className="text-xs text-green-400 mt-1">→ {move.action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Content Plan */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4"><CalendarDays className="w-4 h-4 text-accent" /> Weekly Content Plan</h2>
            <div className="space-y-2">
              {brief.contentPlan?.map((day, i) => (
                <div key={i} className="flex items-start gap-4 p-3 bg-surface-2 rounded-lg border border-border">
                  <div className="w-20 flex-shrink-0">
                    <p className="text-xs font-bold text-foreground">{day.day}</p>
                    <p className="text-[10px] text-muted">{day.platform}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] bg-surface text-muted px-1.5 py-0.5 rounded border border-border">{day.format}</span>
                      <p className="text-xs font-medium text-foreground-muted">{day.topic}</p>
                    </div>
                    <p className="text-xs text-muted">{day.hook}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI Targets */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-accent" /> KPI Targets This Week</h2>
            <div className="grid grid-cols-2 gap-3">
              {brief.kpiTargets?.map((kpi, i) => (
                <div key={i} className="bg-surface-2 rounded-xl p-4 border border-border">
                  <p className="text-xs text-muted mb-1">{kpi.metric}</p>
                  <p className="text-xl font-bold text-accent mb-1">{kpi.target}</p>
                  <p className="text-xs text-muted">{kpi.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
