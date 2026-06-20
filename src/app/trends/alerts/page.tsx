"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { Badge } from "@/components/ui/badge";
import { cn, platformIcon, platformColor, timeAgo } from "@/lib/utils";
import { TrendAlert, TrendScanResult, AlertStatus } from "@/lib/trend-alerts";
import { Sources, type Source } from "@/components/ui/sources";
import { GenerationError } from "@/components/ui/generation-error";
import {
  Bell, Zap, TrendingUp, Clock, RefreshCw,
  CheckCheck, X, Eye, Sparkles, Hash,
  AlertCircle, ChevronDown, ChevronRight,
} from "lucide-react";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-400/10 border-red-400/30 text-red-400",
  high: "bg-orange-400/10 border-orange-400/30 text-orange-400",
  medium: "bg-amber-400/10 border-amber-400/30 text-amber-400",
  watch: "bg-zinc-400/10 border-zinc-400/30 text-zinc-400",
};

const PRIORITY_ICONS: Record<string, string> = {
  urgent: "⚡",
  high: "🔥",
  medium: "📈",
  watch: "👁",
};

const STATUS_STYLES: Record<AlertStatus, string> = {
  new: "bg-green-400/10 text-green-400 border-green-400/20",
  seen: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  actioned: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  dismissed: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
};

const ARABIC_TEXT = /[\u0600-\u06FF]/;
const uniqueSignals = (values: string[]) => values.filter((v, i, a) => v && v.trim().length > 3 && a.indexOf(v) === i);

function AlertCard({ alert, onAction, onDismiss }: {
  alert: TrendAlert;
  onAction: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(alert.priority === "urgent");
  const arabicEvidence = uniqueSignals([
    ...(alert.arabicEvidence ?? []),
    ...(alert.signals ?? []).filter((s) => ARABIC_TEXT.test(s)),
  ]).slice(0, 10);
  const englishSignals = uniqueSignals((alert.signals ?? []).filter((s) => !ARABIC_TEXT.test(s))).slice(0, 8);

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all",
      alert.priority === "urgent" ? "border-red-400/30 bg-red-400/5" :
      alert.priority === "high" ? "border-orange-400/20 bg-surface" :
      "border-border/50 bg-surface"
    )}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
        <div className="flex items-start gap-3">
          <ScoreRing score={alert.currentScore} size="sm" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-base">{PRIORITY_ICONS[alert.priority]}</span>
              <h3 className="text-sm font-bold text-foreground">{alert.trendName}</h3>
              {alert.arabicName && (
                <span className="text-xs text-muted font-arabic">{alert.arabicName}</span>
              )}
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase", PRIORITY_STYLES[alert.priority])}>
                {alert.priority}
              </span>
              {alert.isNew && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold">
                  NEW TREND
                </span>
              )}
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", STATUS_STYLES[alert.status])}>
                {alert.status}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", platformColor(alert.platform))}>
                {platformIcon(alert.platform)} {alert.platform}
              </span>
              <span className="text-xs text-green-400 font-bold">+{alert.scoreChange} points</span>
              <span className="text-xs text-foreground-muted">+{alert.growthRate}% growth</span>
              <span className="text-xs text-muted">Peaks in {alert.peakDaysEstimate}d</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onAction(alert.id); }}
              className="text-[10px] bg-accent/10 border border-accent/20 text-accent px-2 py-1 rounded-lg hover:bg-accent/20 transition-colors"
            >
              ✓ Actioned
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
              className="text-[10px] bg-surface-2 border border-border text-muted px-2 py-1 rounded-lg hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
            {expanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4 animate-fade-in">

          {/* Score change */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-surface-2 rounded-lg p-2.5 text-center">
              <p className="text-sm font-bold text-foreground">{alert.previousScore}</p>
              <p className="text-[9px] text-muted mt-0.5">Previous Score</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-2.5 text-center">
              <p className="text-sm font-bold text-green-400">{alert.currentScore}</p>
              <p className="text-[9px] text-muted mt-0.5">Current Score</p>
            </div>
            <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-2.5 text-center">
              <p className="text-sm font-bold text-green-400">+{alert.scoreChange}</p>
              <p className="text-[9px] text-muted mt-0.5">Score Jump</p>
            </div>
            <div className="bg-surface-2 rounded-lg p-2.5 text-center">
              <p className="text-sm font-bold text-accent">+{alert.growthRate}%</p>
              <p className="text-[9px] text-muted mt-0.5">Weekly Growth</p>
            </div>
          </div>

          {/* Source */}
          <div className="bg-blue-400/5 border border-blue-400/20 rounded-lg p-3">
            <p className="text-[10px] font-bold text-blue-400 mb-1">📡 Detected From</p>
            <p className="text-xs text-foreground-muted">{alert.source}</p>
          </div>

          {/* Signals */}
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Data Signals</p>
            {arabicEvidence.length > 0 && (
              <div className="bg-green-400/5 border border-green-400/20 rounded-lg p-3 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] font-bold text-green-300 uppercase tracking-wider">Arabic Evidence</p>
                  <span className="text-[9px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded font-bold">70% weight</span>
                </div>
                <div className="flex flex-wrap gap-1.5" dir="rtl">
                  {arabicEvidence.map((signal, i) => (
                    <span key={i} className="text-[10px] bg-surface text-green-200 border border-green-400/20 px-2 py-1 rounded-full font-arabic">{signal}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {(englishSignals.length ? englishSignals : alert.signals).map((signal, i) => (
                <div key={i} className="flex gap-2 bg-surface-2 rounded-lg px-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                  <p className="text-xs text-foreground-muted">{signal}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Why it matters for Debackers */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3 h-3 text-accent" />
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Why It Matters for Debackers</p>
            </div>
            <p className="text-xs text-foreground-muted">{alert.relevanceToDebackers}</p>
          </div>

          {/* Suggested Action — additive, not replacing existing plans */}
          <div className="bg-green-400/5 border border-green-400/20 rounded-lg p-3">
            <p className="text-[10px] font-bold text-green-400 mb-1">→ Suggested Action</p>
            <p className="text-xs text-green-300">{alert.suggestedAction}</p>
            <p className="text-[10px] text-muted mt-2 italic">Note: This is additive — your existing campaigns are unchanged.</p>
          </div>

          {/* Related campaigns */}
          {alert.relatedCampaigns && alert.relatedCampaigns.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Affects Existing Campaigns</p>
              <div className="flex flex-wrap gap-1.5">
                {alert.relatedCampaigns.map((c) => (
                  <span key={c} className="text-[10px] bg-surface-2 border border-border text-foreground-muted px-2 py-1 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hook + Hashtags */}
          {alert.hook && (
            <div className="bg-surface-2 rounded-lg p-3">
              <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1.5">Suggested Hook</p>
              <p className="text-sm text-foreground font-arabic">{alert.hook}</p>
              {alert.hashtags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {alert.hashtags.map(h => (
                    <span key={h} className="text-[9px] bg-surface text-foreground-muted px-1.5 py-0.5 rounded-full">{h}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted text-right">
            Detected: {new Date(alert.detectedAt).toLocaleString("en-EG")}
          </p>
        </div>
      )}
    </div>
  );
}

export default function TrendAlertsPage() {
  const [data, setData] = useState<{
    alerts: TrendAlert[];
    lastScan: TrendScanResult | null;
    newAlerts: number;
    urgentAlerts: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<"all" | "new" | "urgent">("new");
  const [sources, setSources] = useState<Source[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/trends/scan")
      .then(r => r.json())
      .then(d => { setData(d); setSources(d.sources ?? []); setGeneratedAt(d.generatedAt); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/trends/scan", { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(`Scan failed: ${e.details || res.status}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleAction = async (id: string) => {
    await fetch(`/api/trends/scan?action=action&id=${id}`);
    load();
  };

  const handleDismiss = async (id: string) => {
    await fetch(`/api/trends/scan?action=dismiss&id=${id}`);
    load();
  };

  const alerts = data?.alerts ?? [];
  const filtered = filter === "new" ? alerts.filter(a => a.status === "new") :
                   filter === "urgent" ? alerts.filter(a => a.priority === "urgent") :
                   alerts;

  const lastScan = data?.lastScan;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Trend Alert Center"
        subtitle="Live weekly scan — new trends added without touching existing plans"
        badge={data?.newAlerts ? `${data.newAlerts} New` : "Live"}
        action={
          <div className="flex items-center gap-3">
            {lastScan && (
              <span className="text-xs text-muted">
                Last scan: {new Date(lastScan.scannedAt).toLocaleDateString("en-EG")}
              </span>
            )}
            <button
              onClick={handleScan}
              disabled={scanning}
              className="flex items-center gap-2 bg-accent text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-accent-light transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning…" : "Run Scan Now"}
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6">

        {generatedAt && (
          <p className="text-xs text-muted">🔄 Last scanned {timeAgo(generatedAt)} · live web search · shared with your team</p>
        )}

        {error && <GenerationError error={error} />}

        {alerts.length > 0 && <Sources sources={sources} />}

        {/* How it works */}
        <div className="bg-surface border border-border/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-foreground mb-3">🔄 How Trend Monitoring Works</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { step: "1", label: "Weekly scan", desc: "Uses Serper Google results, autocomplete demand, and publisher feeds for Egypt" },
              { step: "2", label: "Score change", desc: "If a trend score jumps 6+ points or growth rate exceeds 25%, an alert fires" },
              { step: "3", label: "Alert created", desc: "New alert added with source, signals, and suggested action — existing plans untouched" },
              { step: "4", label: "You decide", desc: "Review, action (add to next campaign), or dismiss. Nothing changes automatically" },
            ].map(({ step, label, desc }) => (
              <div key={step} className="bg-surface-2 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-accent">{step}.</span>
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                </div>
                <p className="text-[10px] text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        {lastScan && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{lastScan.alertsGenerated}</p>
              <p className="text-xs text-muted mt-1">Alerts This Scan</p>
            </div>
            <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-accent">{lastScan.newTrends}</p>
              <p className="text-xs text-muted mt-1">New Trends Found</p>
            </div>
            <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{lastScan.risingTrends}</p>
              <p className="text-xs text-muted mt-1">Rising Trends</p>
            </div>
            <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{data?.newAlerts ?? 0}</p>
              <p className="text-xs text-muted mt-1">Awaiting Review</p>
            </div>
          </div>
        )}

        {/* Last scan summary */}
        {lastScan?.scanSummary && (
          <div className={cn(
            "rounded-xl border p-4",
            data?.urgentAlerts ? "bg-red-400/5 border-red-400/20" : "bg-accent/5 border-accent/20"
          )}>
            <div className="flex items-center gap-2">
              {data?.urgentAlerts ? <Zap className="w-4 h-4 text-red-400" /> : <Bell className="w-4 h-4 text-accent" />}
              <p className="text-sm font-semibold text-foreground">{lastScan.scanSummary}</p>
            </div>
            <p className="text-[10px] text-muted mt-1">
              Next scan: {new Date(lastScan.nextScanAt).toLocaleDateString("en-EG")} · Scans every 7 days
            </p>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2">
          {(["new", "urgent", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-accent text-black" : "bg-surface-2 text-foreground-muted hover:text-foreground"
              )}
            >
              {f === "new" ? `New (${data?.newAlerts ?? 0})` :
               f === "urgent" ? `Urgent (${data?.urgentAlerts ?? 0})` :
               `All (${alerts.length})`}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface border border-border/50 rounded-xl p-16 text-center">
            <Bell className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-sm text-foreground mb-1">
              {filter === "new" ? "No new alerts" : "No alerts found"}
            </p>
            <p className="text-xs text-muted mb-4">
              Run a scan to check for new Egyptian fashion trends
            </p>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="bg-accent text-black px-6 py-2 rounded-lg text-sm font-bold hover:bg-accent-light transition-all"
            >
              {scanning ? "Scanning…" : "Run First Scan"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAction={handleAction}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
