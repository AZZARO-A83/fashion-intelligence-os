"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ProductSuggestions } from "@/components/campaigns/product-suggestions";
import { ScoreRing } from "@/components/ui/score-ring";
import { cn, formatNumber, getMonthName, platformIcon, platformColor } from "@/lib/utils";
import {
  Sparkles, Calendar, TrendingUp, Target, Users,
  ChevronDown, ChevronRight, Zap, AlertCircle, CheckCircle2,
  ShoppingCart, Instagram, BarChart3
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  type: "hero" | "supporting" | "always-on";
  objective: string;
  audience: string;
  offer?: string;
  platforms: string[];
  contentTypes: string[];
  hooks: string[];
  captions: string[];
  cta?: string;
  visualDirection?: string;
  weekOfMonth: number;
  budgetPriority: "high" | "medium" | "low";
  estimatedKPIs: { reach: number; engagement: number; conversions: number; revenue: number };
  confidenceScore: number;
  explanation: string;
  competitorGap: string;
  dataSignals: string[];
}

interface MonthlyPlan {
  monthSummary: string;
  heroInsight: string;
  campaigns: Campaign[];
  weeklyCalendar: Record<string, string[]>;
  contentPlan: Record<string, number>;
  budgetAllocation: Record<string, number>;
}

interface DataUsed {
  shopify: boolean;
  instagram: boolean;
  facebookAds: boolean;
  tiktok: boolean;
  competitors: string[];
  trends: number;
  marketGaps: number;
}

const TYPE_STYLES = {
  hero: "bg-accent/10 border-accent/30 text-accent",
  supporting: "bg-blue-400/10 border-blue-400/30 text-blue-400",
  "always-on": "bg-zinc-400/10 border-zinc-400/30 text-zinc-400",
};

const BUDGET_COLORS = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-green-400",
};

function CampaignCard({ campaign, index }: { campaign: Campaign; index: number }) {
  const [expanded, setExpanded] = useState(campaign.type === "hero");

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all",
      campaign.type === "hero"
        ? "border-accent/30 bg-accent/5"
        : "border-border/50 bg-surface"
    )}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-5 text-left">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted font-medium">#{index + 1}</span>
            <ScoreRing score={campaign.confidenceScore} size="md" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-bold text-foreground">{campaign.name}</h3>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase", TYPE_STYLES[campaign.type])}>
                {campaign.type}
              </span>
              <span className="text-[10px] text-muted">Week {campaign.weekOfMonth}</span>
              <span className={cn("text-[10px] font-bold ml-auto", BUDGET_COLORS[campaign.budgetPriority])}>
                {campaign.budgetPriority.toUpperCase()} BUDGET
              </span>
            </div>

            <p className="text-xs text-foreground-muted mb-2">{campaign.objective}</p>

            <div className="flex flex-wrap gap-1.5">
              {campaign.platforms.map((p) => (
                <span key={p} className={cn("text-[10px] px-2 py-0.5 rounded-full border", platformColor(p))}>
                  {platformIcon(p)} {p}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <p className="text-xs font-bold text-accent">EGP {formatNumber(campaign.estimatedKPIs.revenue)}</p>
            <p className="text-[10px] text-muted">est. revenue</p>
            {expanded ? <ChevronDown className="w-4 h-4 text-muted mt-1" /> : <ChevronRight className="w-4 h-4 text-muted mt-1" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-5 space-y-4 animate-fade-in">

          {/* WHY */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold text-accent">WHY THIS CAMPAIGN</span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">{campaign.explanation}</p>
          </div>

          {/* Competitor Gap */}
          <div className="bg-green-400/5 border border-green-400/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Competitor Gap Exploited</span>
            </div>
            <p className="text-xs text-green-300">{campaign.competitorGap}</p>
          </div>

          {/* Data Signals */}
          {campaign.dataSignals?.length > 0 && (
            <div>
              <p className="text-[10px] text-muted font-medium uppercase tracking-wider mb-2">Data Signals</p>
              <div className="flex flex-wrap gap-2">
                {campaign.dataSignals.map((s, i) => (
                  <span key={i} className="text-[10px] bg-surface-2 text-foreground-muted px-2 py-1 rounded-full border border-border">
                    📊 {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">Audience</p>
                <p className="text-xs text-foreground bg-surface-2 px-3 py-2 rounded-lg">{campaign.audience}</p>
              </div>
              {campaign.offer && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">Offer</p>
                  <p className="text-xs text-foreground bg-surface-2 px-3 py-2 rounded-lg">{campaign.offer}</p>
                </div>
              )}
              {campaign.cta && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">CTA</p>
                  <p className="text-xs text-accent bg-accent/5 border border-accent/20 px-3 py-2 rounded-lg">{campaign.cta}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">KPIs</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Reach", value: formatNumber(campaign.estimatedKPIs.reach) },
                  { label: "Engagement", value: formatNumber(campaign.estimatedKPIs.engagement) },
                  { label: "Conversions", value: campaign.estimatedKPIs.conversions },
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

          {/* Hooks */}
          {campaign.hooks?.length > 0 && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Content Hooks</p>
              <div className="space-y-1.5">
                {campaign.hooks.map((h, i) => (
                  <div key={i} className="flex gap-2 bg-surface-2 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-accent flex-shrink-0">{i + 1}.</span>
                    <p className="text-xs text-foreground font-arabic">{h}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Caption */}
          {campaign.captions?.[0] && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Sample Caption</p>
              <p className="text-xs text-foreground bg-surface-2 rounded-lg p-3 leading-relaxed font-arabic">{campaign.captions[0]}</p>
            </div>
          )}

          {/* Real Debackers Product Images */}
          <ProductSuggestions
            campaignName={campaign.name}
            audience={campaign.audience}
            contentTypes={campaign.contentTypes}
          />

          {/* Visual Direction */}
          {campaign.visualDirection && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Visual Direction</p>
              <p className="text-xs text-foreground-muted bg-surface-2 rounded-lg p-3 leading-relaxed">{campaign.visualDirection}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DataSourceBadge({ active, label, icon }: { active: boolean; label: string; icon: React.ReactNode }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium",
      active
        ? "bg-green-400/10 border-green-400/20 text-green-400"
        : "bg-surface-2 border-border text-muted"
    )}>
      {icon}
      {label}
      {active ? <CheckCircle2 className="w-3 h-3 ml-1" /> : <AlertCircle className="w-3 h-3 ml-1" />}
    </div>
  );
}

export default function MonthlyPlanPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [dataUsed, setDataUsed] = useState<DataUsed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch("/api/monthly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlan(data.plan);
      setDataUsed(data.dataUsed);
    } catch (e: any) {
      setError(e.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const heroCampaign = plan?.campaigns.find((c) => c.type === "hero");
  const otherCampaigns = plan?.campaigns.filter((c) => c.type !== "hero") ?? [];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Monthly Campaign Plan"
        subtitle="Full marketing OS — Shopify + Social + Competitor + AI"
        badge="Debackers"
        action={
          <div className="flex items-center gap-3">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-surface-2 border border-border text-foreground-muted text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)} {year}</option>
              ))}
            </select>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 bg-accent text-black px-5 py-2 rounded-lg text-sm font-bold hover:bg-accent-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Analyzing all data…" : `Build ${getMonthName(month)} Plan`}
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6">

        {/* Data Sources */}
        <div className="bg-surface border border-border/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">Data Sources Feeding This Plan</p>
          <div className="flex flex-wrap gap-2">
            <DataSourceBadge active={true} label="Shopify Sales" icon={<ShoppingCart className="w-3.5 h-3.5" />} />
            <DataSourceBadge active={true} label="Instagram" icon={<Instagram className="w-3.5 h-3.5" />} />
            <DataSourceBadge active={true} label="Facebook Ads" icon={<span className="text-xs">📘</span>} />
            <DataSourceBadge active={true} label="TikTok" icon={<span className="text-xs">🎵</span>} />
            <DataSourceBadge active={true} label="Tie House" icon={<Users className="w-3.5 h-3.5" />} />
            <DataSourceBadge active={true} label="British House" icon={<Users className="w-3.5 h-3.5" />} />
            <DataSourceBadge active={true} label="Massimo Dutti" icon={<Users className="w-3.5 h-3.5" />} />
            <DataSourceBadge active={true} label="Trend Engine" icon={<TrendingUp className="w-3.5 h-3.5" />} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-red-400 font-medium">{error}</p>
              <p className="text-[10px] text-muted mt-1">Add ANTHROPIC_API_KEY to .env.local to enable AI generation</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-surface border border-border/50 rounded-xl p-12 text-center">
            <Sparkles className="w-10 h-10 text-accent mx-auto mb-4 animate-spin" />
            <p className="text-sm font-semibold text-foreground mb-1">Building your {getMonthName(month)} plan…</p>
            <p className="text-xs text-muted">Analyzing Shopify + Social + Competitors + Trends</p>
            <div className="flex justify-center gap-6 mt-6">
              {["Shopify data", "Social analytics", "Competitor gaps", "AI generation"].map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  <p className="text-[10px] text-muted">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!plan && !loading && !error && (
          <div className="bg-surface border border-border/50 rounded-xl p-16 text-center">
            <Calendar className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">Ready to build your {getMonthName(month)} plan</p>
            <p className="text-xs text-muted mb-2">Combines Shopify + Instagram + TikTok + Facebook + Competitor data</p>
            <p className="text-xs text-muted mb-6">Debackers vs Tie House · British House · Massimo Dutti</p>
            <button onClick={generate} className="bg-accent text-black px-8 py-3 rounded-xl text-sm font-bold hover:bg-accent-light transition-all">
              Generate Full Plan
            </button>
          </div>
        )}

        {/* Plan Output */}
        {plan && !loading && (
          <>
            {/* Summary */}
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-bold text-accent">{getMonthName(month)} {year} — Strategic Overview</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-3">{plan.monthSummary}</p>
              <div className="bg-accent/10 rounded-lg px-4 py-2.5">
                <p className="text-xs font-bold text-accent mb-0.5">💡 Hero Insight</p>
                <p className="text-xs text-foreground-muted">{plan.heroInsight}</p>
              </div>
            </div>

            {/* Plan Stats */}
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Total Campaigns", value: plan.campaigns.length },
                { label: "Content Pieces", value: plan.contentPlan.totalPosts ?? plan.campaigns.length * 8 },
                { label: "Avg Confidence", value: `${Math.round(plan.campaigns.reduce((s, c) => s + c.confidenceScore, 0) / plan.campaigns.length)}%` },
                { label: "Est. Revenue", value: `EGP ${formatNumber(plan.campaigns.reduce((s, c) => s + c.estimatedKPIs.revenue, 0))}` },
                { label: "Competitors Tracked", value: dataUsed?.competitors.length ?? 3 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface border border-border/50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-[10px] text-muted mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Weekly Calendar */}
            {plan.weeklyCalendar && (
              <div className="bg-surface border border-border/50 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Monthly Calendar</h2>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(plan.weeklyCalendar).map(([week, campaigns]) => (
                    <div
                      key={week}
                      onClick={() => setActiveWeek(activeWeek === week ? null : week)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        activeWeek === week ? "border-accent/30 bg-accent/5" : "border-border/50 bg-surface-2 hover:border-border"
                      )}
                    >
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">{week.replace("week", "Week ")}</p>
                      <div className="space-y-1">
                        {(campaigns as string[]).map((name, i) => (
                          <p key={i} className="text-[10px] text-foreground-muted leading-snug">{name}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hero Campaign First */}
            {heroCampaign && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">Hero Campaign</h2>
                </div>
                <CampaignCard campaign={heroCampaign} index={0} />
              </div>
            )}

            {/* Supporting Campaigns */}
            {otherCampaigns.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3">Supporting Campaigns</h2>
                <div className="space-y-3">
                  {otherCampaigns.map((c, i) => (
                    <CampaignCard key={c.id} campaign={c} index={i + 1} />
                  ))}
                </div>
              </div>
            )}

            {/* Data attribution */}
            <div className="bg-surface-2 rounded-xl p-4 text-center">
              <p className="text-[10px] text-muted">
                Plan generated using: Shopify sales · Instagram analytics · Facebook Ads · TikTok ·
                {dataUsed?.competitors.join(", ")} competitor intelligence · {dataUsed?.trends} trends · {dataUsed?.marketGaps} market gaps
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
