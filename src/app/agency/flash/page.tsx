"use client";

import { useState } from "react";
import { FlameKindling, RefreshCw, TrendingUp, Zap, Users, AlertCircle, Copy, Check } from "lucide-react";
import { FlashBrief } from "@/types";

function DataBadge({ type }: { type: "live" | "ai" | "mock" }) {
  if (type === "live") return <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">🟢 LIVE</span>;
  if (type === "ai") return <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">🔵 AI RESEARCH</span>;
  return <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">🔴 MOCK</span>;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colors = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${colors[urgency as keyof typeof colors] || colors.low}`}>
      {urgency}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-muted hover:text-accent transition-colors">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function FlashBriefPage() {
  const [brief, setBrief] = useState<FlashBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<"idle"|"searching"|"generating"|"done">("idle");

  const generate = async () => {
    setLoading(true);
    setError(null);
    setBrief(null);

    try {
      // Step 1 — search the live web
      setStep("searching");
      const researchRes = await fetch("/api/agency/research");
      if (!researchRes.ok) throw new Error("Web search failed");
      const research = await researchRes.json();

      // Step 2 — generate brief using search results
      setStep("generating");
      const res = await fetch("/api/agency/flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ research }),
      });
      if (!res.ok) throw new Error("Failed to generate brief");
      const data = await res.json();
      setBrief(data.brief);
      setStep("done");
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
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <FlameKindling className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Flash Brief</h1>
              <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold">3-DAY</span>
              <DataBadge type="ai" />
            </div>
            <p className="text-sm text-muted">Market research + campaign ideas for the next 3 days — For marketing team & content creators</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-black rounded-lg font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Researching..." : brief ? "Refresh Brief" : "Generate Brief"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!brief && !loading && !error && (
        <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center">
          <FlameKindling className="w-12 h-12 text-orange-400 mx-auto mb-4 opacity-50" />
          <p className="text-foreground font-semibold mb-2">Ready to research the market</p>
          <p className="text-sm text-muted mb-6">Click Generate Brief — AI will analyze Egyptian fashion market trends, competitor moves, and campaign opportunities for the next 3 days.</p>
          <button onClick={generate} className="px-6 py-3 bg-accent text-black rounded-lg font-semibold text-sm hover:bg-accent/90 transition-all">
            Generate Flash Brief
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <RefreshCw className="w-6 h-6 text-accent animate-spin" />
            <p className="text-foreground font-semibold">
              {step === "searching" ? "Step 1/2 — Searching the live web..." : "Step 2/2 — Generating your brief..."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${step === "searching" ? "bg-accent/20 text-accent" : "bg-green-500/20 text-green-400"}`}>
              {step === "searching" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>✓</span>}
              TikTok trends Egypt
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${step === "searching" ? "bg-accent/20 text-accent" : step === "generating" ? "bg-green-500/20 text-green-400" : "bg-surface-2 text-muted"}`}>
              {step === "searching" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : step !== "idle" ? <span>✓</span> : null}
              Competitor pages
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${step === "searching" ? "bg-accent/20 text-accent" : step === "generating" ? "bg-green-500/20 text-green-400" : "bg-surface-2 text-muted"}`}>
              {step === "searching" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : step !== "idle" ? <span>✓</span> : null}
              Influencers
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${step === "generating" ? "bg-blue-500/20 text-blue-400" : "bg-surface-2 text-muted"}`}>
              {step === "generating" && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              AI generating
            </div>
          </div>
        </div>
      )}

      {/* Brief content */}
      {brief && !loading && (
        <div className="space-y-6">
          {/* Meta */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap gap-4 text-xs text-muted">
            <span>Generated: {new Date(brief.generatedAt).toLocaleString("en-EG")}</span>
            <span>Period: {brief.period}</span>
            <span>Season: {brief.season}</span>
          </div>

          {/* Market Pulse */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <span className="text-lg">📡</span> Market Pulse
              </h2>
              <DataBadge type="ai" />
            </div>
            <p className="text-foreground-muted leading-relaxed">{brief.marketPulse}</p>
          </div>

          {/* Trends */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" /> Top Trends Right Now
              </h2>
              <DataBadge type="ai" />
            </div>
            <div className="space-y-4">
              {brief.trends?.map((trend, i) => (
                <div key={i} className="bg-surface-2 rounded-xl p-4 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{trend.name}</span>
                      <span className="text-[10px] bg-surface text-muted px-2 py-0.5 rounded border border-border capitalize">{trend.platform}</span>
                    </div>
                    <UrgencyBadge urgency={trend.urgency} />
                  </div>
                  <p className="text-xs text-muted mb-1"><span className="text-foreground-muted font-medium">Why it matters:</span> {trend.why}</p>
                  <p className="text-xs text-muted mb-3"><span className="text-foreground-muted font-medium">How to use it:</span> {trend.howToUse}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {trend.hashtags?.map((tag, j) => (
                      <span key={j} className="text-[11px] bg-accent/10 text-accent px-2 py-0.5 rounded font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campaign Ideas */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" /> Campaign Ideas
              </h2>
              <DataBadge type="ai" />
            </div>
            <div className="space-y-4">
              {brief.campaignIdeas?.map((idea, i) => (
                <div key={i} className="bg-surface-2 rounded-xl p-5 border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-foreground">{idea.name}</h3>
                      <p className="text-xs text-muted">{idea.audience} · {idea.format} · {idea.timing}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-accent">{idea.confidence}%</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted mb-3">{idea.objective}</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-surface rounded-lg p-3 border border-border">
                      <p className="text-[10px] text-muted mb-1 font-medium">ARABIC HOOK</p>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground font-medium" dir="rtl">{idea.hook_ar}</p>
                        <CopyButton text={idea.hook_ar} />
                      </div>
                    </div>
                    <div className="bg-surface rounded-lg p-3 border border-border">
                      <p className="text-[10px] text-muted mb-1 font-medium">ENGLISH HOOK</p>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground font-medium">{idea.hook_en}</p>
                        <CopyButton text={idea.hook_en} />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted"><span className="text-blue-400 font-medium">Why now:</span> {idea.whyNow}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor Moves */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" /> Competitor Intelligence
              </h2>
              <DataBadge type="ai" />
            </div>
            <div className="space-y-3">
              {brief.competitorMoves?.map((move, i) => (
                <div key={i} className="bg-surface-2 rounded-xl p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-foreground">{move.competitor}</span>
                  </div>
                  <p className="text-xs text-muted mb-1"><span className="text-foreground-muted font-medium">What they&apos;re doing:</span> {move.observation}</p>
                  <p className="text-xs text-muted mb-1"><span className="text-foreground-muted font-medium">Their gap:</span> {move.gap}</p>
                  <p className="text-xs text-green-400"><span className="font-medium">Debackers move:</span> {move.action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Urgent Actions */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
              <span className="text-lg">⚡</span> Do This in the Next 3 Days
            </h2>
            <div className="space-y-2">
              {brief.urgentActions?.map((action, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                  <span className="text-accent font-bold text-sm flex-shrink-0">{i + 1}.</span>
                  <p className="text-sm text-foreground-muted">{action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* For Creators */}
          <div className="bg-surface border border-orange-500/20 rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
              <span className="text-lg">🎬</span> For Content Creators — Ready to Use
            </h2>

            {/* Ready hooks */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">READY HOOKS — Film these</p>
              <div className="space-y-2">
                {brief.forCreators?.readyHooks?.map((hook, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                    <p className="text-sm text-foreground">{hook}</p>
                    <CopyButton text={hook} />
                  </div>
                ))}
              </div>
            </div>

            {/* Caption formulas */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">CAPTION FORMULAS</p>
              <div className="space-y-2">
                {brief.forCreators?.captionFormulas?.map((cap, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                    <p className="text-sm text-foreground-muted">{cap}</p>
                    <CopyButton text={cap} />
                  </div>
                ))}
              </div>
            </div>

            {/* Hashtag sets */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">HASHTAG SETS — Copy full set</p>
              <div className="space-y-2">
                {brief.forCreators?.hashtagSets?.map((set, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                    <div className="flex flex-wrap gap-1.5">
                      {set.map((tag, j) => (
                        <span key={j} className="text-[11px] bg-accent/10 text-accent px-2 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                    <CopyButton text={set.join(" ")} />
                  </div>
                ))}
              </div>
            </div>

            {/* Visual directions */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">VISUAL DIRECTIONS</p>
              <div className="space-y-2">
                {brief.forCreators?.visualDirections?.map((dir, i) => (
                  <div key={i} className="p-3 bg-surface-2 rounded-lg border border-border">
                    <p className="text-sm text-foreground-muted">{dir}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
