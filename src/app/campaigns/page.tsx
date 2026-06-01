"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ProductSuggestions } from "@/components/campaigns/product-suggestions";
import { ScoreRing } from "@/components/ui/score-ring";
import { Campaign } from "@/types";
import { platformIcon, platformColor, cn, formatNumber, getMonthName } from "@/lib/utils";
import {
  Sparkles, ChevronDown, ChevronRight, Users, Target, Gift,
  Eye, Zap, Calendar, CheckCircle2, AlertCircle,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
  ACTIVE: "bg-green-400/10 text-green-400 border-green-400/20",
  COMPLETED: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  PAUSED: "bg-amber-400/10 text-amber-400 border-amber-400/20",
};

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface border border-border/50 rounded-xl overflow-hidden hover:border-border transition-all">
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start gap-4">
          <ScoreRing score={campaign.confidenceScore} size="md" label="Confidence" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground">{campaign.name}</h3>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", STATUS_STYLES[campaign.status])}>
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-foreground-muted">{campaign.objective}</p>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {campaign.platforms.map((p) => (
                <span key={p} className={cn("text-[10px] px-2 py-0.5 rounded-full border", platformColor(p))}>
                  {platformIcon(p)} {p}
                </span>
              ))}
              {campaign.contentTypes.map((ct) => (
                <span key={ct} className="text-[10px] bg-surface-2 text-foreground-muted border border-border px-2 py-0.5 rounded-full capitalize">
                  {ct}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-xs font-bold text-accent">EGP {formatNumber(campaign.estimatedKPIs.revenue)}</p>
              <p className="text-[10px] text-muted">est. revenue</p>
            </div>
            {expanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-border p-5 space-y-5 animate-fade-in">

          {/* WHY Section — rich signal breakdown */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold text-accent">WHY This Campaign Exists</span>
            </div>
            <div className="space-y-2">
              {campaign.explanation
                .replace("Recommended because:", "")
                .split("·")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((signal, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                    <p className="text-xs text-foreground-muted leading-relaxed">{signal}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Campaign Details Grid */}
          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Users className="w-3 h-3 text-muted" />
                  <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Target Audience</span>
                </div>
                <p className="text-xs text-foreground bg-surface-2 px-3 py-2 rounded-lg">{campaign.audience}</p>
              </div>

              {campaign.offer && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Gift className="w-3 h-3 text-muted" />
                    <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Offer</span>
                  </div>
                  <p className="text-xs text-foreground bg-surface-2 px-3 py-2 rounded-lg">{campaign.offer}</p>
                </div>
              )}

              {campaign.cta && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target className="w-3 h-3 text-muted" />
                    <span className="text-[10px] text-muted font-medium uppercase tracking-wider">CTA</span>
                  </div>
                  <p className="text-xs text-foreground bg-surface-2 px-3 py-2 rounded-lg">{campaign.cta}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* KPIs */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3 h-3 text-muted" />
                  <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Estimated KPIs</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Reach", value: formatNumber(campaign.estimatedKPIs.reach) },
                    { label: "Engagement", value: formatNumber(campaign.estimatedKPIs.engagement) },
                    { label: "Conversions", value: campaign.estimatedKPIs.conversions.toString() },
                    { label: "Revenue", value: `EGP ${formatNumber(campaign.estimatedKPIs.revenue)}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-2 rounded-lg p-2 text-center">
                      <p className="text-xs font-bold text-foreground">{value}</p>
                      <p className="text-[10px] text-muted mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hooks */}
          {campaign.hooks.length > 0 && (
            <div>
              <p className="text-[10px] text-muted font-medium uppercase tracking-wider mb-2">Content Hooks</p>
              <div className="space-y-2">
                {campaign.hooks.map((hook, i) => (
                  <div key={i} className="flex gap-2.5 bg-surface-2 rounded-lg px-3 py-2.5">
                    <span className="text-xs font-bold text-accent">{i + 1}</span>
                    <p className="text-xs text-foreground font-arabic">{hook}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Captions */}
          {campaign.captions.length > 0 && (
            <div>
              <p className="text-[10px] text-muted font-medium uppercase tracking-wider mb-2">Sample Caption</p>
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="text-xs text-foreground leading-relaxed font-arabic">{campaign.captions[0]}</p>
              </div>
            </div>
          )}

          {/* Visual Direction */}
          {campaign.visualDirection && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Eye className="w-3 h-3 text-muted" />
                <p className="text-[10px] text-muted font-medium uppercase tracking-wider">Visual Direction</p>
              </div>
              <p className="text-xs text-foreground-muted bg-surface-2 rounded-lg p-3 leading-relaxed">
                {campaign.visualDirection}
              </p>
            </div>
          )}

          {/* Real Debackers Product Images from Shopify */}
          <ProductSuggestions
            campaignName={campaign.name}
            audience={campaign.audience}
            contentTypes={campaign.contentTypes}
          />

        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [generated, setGenerated] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear] = useState(now.getFullYear());

  const load = () => {
    fetch(`/api/campaigns?month=${selectedMonth}&year=${selectedYear}`)
      .then((r) => r.json())
      .then((d) => { setCampaigns(d.campaigns); setLoading(false); });
  };

  useEffect(() => { load(); }, [selectedMonth]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGenerated(data.campaigns);
    } catch (e: any) {
      setError(e.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const allCampaigns = [...campaigns, ...generated];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Campaign Intelligence"
        subtitle="AI-generated monthly campaign plans from real data"
        badge="AI-Powered"
        action={
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-surface-2 border border-border text-foreground-muted text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-accent text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Generating…" : `Generate ${getMonthName(selectedMonth)} Plan`}
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6">

        {/* Status Bar */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Campaigns", value: allCampaigns.length, color: "text-foreground" },
            { label: "Active", value: allCampaigns.filter((c) => c.status === "ACTIVE").length, color: "text-green-400" },
            { label: "Draft", value: allCampaigns.filter((c) => c.status === "DRAFT").length, color: "text-amber-400" },
            { label: "Avg Confidence", value: allCampaigns.length ? `${Math.round(allCampaigns.reduce((s, c) => s + c.confidenceScore, 0) / allCampaigns.length)}%` : "—", color: "text-accent" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface border border-border/50 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Generation How-It-Works Banner */}
        <div className="bg-surface border border-border/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-foreground-muted mb-3">How campaigns are generated:</p>
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { step: "1", label: "Detect Trends", icon: "📈" },
              { step: "→", label: "", icon: "" },
              { step: "2", label: "Analyze Sales", icon: "🛒" },
              { step: "→", label: "", icon: "" },
              { step: "3", label: "Study Competitors", icon: "🔍" },
              { step: "→", label: "", icon: "" },
              { step: "4", label: "Find Gaps", icon: "💡" },
              { step: "→", label: "", icon: "" },
              { step: "5", label: "Generate Campaign", icon: "⚡" },
              { step: "→", label: "", icon: "" },
              { step: "6", label: "Score Confidence", icon: "✅" },
            ].map(({ step, label, icon }, i) => (
              step === "→" ? (
                <ChevronRight key={i} className="w-3 h-3 text-muted flex-shrink-0" />
              ) : (
                <div key={i} className="flex items-center gap-1.5 bg-surface-2 rounded-lg px-3 py-2 flex-shrink-0">
                  <span className="text-base">{icon}</span>
                  <div>
                    <p className="text-[10px] font-bold text-accent">Step {step}</p>
                    <p className="text-[10px] text-foreground-muted">{label}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Generated marker */}
        {generated.length > 0 && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <p className="text-xs text-green-400 font-medium">{generated.length} campaigns generated by Claude AI</p>
          </div>
        )}

        {/* Campaign List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-surface rounded-xl animate-pulse" />)}
          </div>
        ) : allCampaigns.length === 0 ? (
          <div className="bg-surface border border-border/50 rounded-xl p-16 text-center">
            <Calendar className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-sm text-foreground mb-1">No campaigns yet for {getMonthName(selectedMonth)}</p>
            <p className="text-xs text-muted mb-4">Click "Generate Plan" to create AI-powered campaigns from your data</p>
            <button
              onClick={handleGenerate}
              className="bg-accent text-black px-6 py-2 rounded-lg text-sm font-semibold hover:bg-accent-light transition-colors"
            >
              Generate Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {allCampaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        )}

      </div>
    </div>
  );
}
