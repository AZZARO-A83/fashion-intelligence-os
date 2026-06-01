"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { cn } from "@/lib/utils";
import { CompetitorIntelligence } from "@/lib/competitor-intelligence";
import {
  ExternalLink, TrendingUp, TrendingDown, Users,
  Hash, Eye, AlertCircle, Plus, Instagram, Globe,
  Play, Megaphone, ShoppingBag, ChevronDown, ChevronRight
} from "lucide-react";

// Meta Ad Library direct links per competitor
const META_AD_LIBRARY_LINKS: Record<string, string> = {
  "Tie House": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=EG&q=tie+house&search_type=keyword_unordered",
  "British House": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=EG&q=british+house+egypt&search_type=keyword_unordered",
  "Massimo Dutti": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=EG&q=massimo+dutti&search_type=keyword_unordered",
};

const INSTAGRAM_LINKS: Record<string, string> = {
  "Tie House": "https://www.instagram.com/tiehouse/",
  "British House": "https://www.instagram.com/british.house.official/",
  "Massimo Dutti": "https://www.instagram.com/massimodutti/",
};

const TIKTOK_LINKS: Record<string, string> = {
  "Tie House": "https://www.tiktok.com/@tiehouse",
  "British House": "https://www.tiktok.com/@britishhouse",
  "Massimo Dutti": "https://www.tiktok.com/@massimodutti",
};

const THREAT_COLORS = {
  high: "bg-red-400/10 border-red-400/20 text-red-400",
  medium: "bg-amber-400/10 border-amber-400/20 text-amber-400",
  low: "bg-green-400/10 border-green-400/20 text-green-400",
};

function CompetitorCard({ competitor }: { competitor: CompetitorIntelligence }) {
  const [expanded, setExpanded] = useState(false);
  const snap = competitor as any;

  return (
    <div className="bg-surface border border-border/50 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-foreground">{competitor.name}</h3>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase", THREAT_COLORS[competitor.threatLevel])}>
                {competitor.threatLevel} threat
              </span>
            </div>
            <div className="flex items-center gap-3">
              {competitor.website && (
                <a href={`https://${competitor.website}`} target="_blank" rel="noreferrer"
                  className="text-xs text-muted hover:text-accent flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {competitor.website}
                </a>
              )}
            </div>
          </div>

          {/* Live Ad Library Button */}
          <a
            href={META_AD_LIBRARY_LINKS[competitor.name]}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors"
          >
            <Megaphone className="w-3 h-3" />
            View Live Ads
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Social Links */}
        <div className="flex gap-2 mt-3">
          <a href={INSTAGRAM_LINKS[competitor.name]} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 bg-pink-400/10 border border-pink-400/20 text-pink-400 px-2.5 py-1 rounded-lg text-[10px] font-medium hover:bg-pink-400/20 transition-colors">
            <Instagram className="w-3 h-3" /> Instagram
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a href={TIKTOK_LINKS[competitor.name]} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 px-2.5 py-1 rounded-lg text-[10px] font-medium hover:bg-cyan-400/20 transition-colors">
            🎵 TikTok
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          {competitor.website && (
            <a href={`https://${competitor.website}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 bg-surface-2 border border-border text-foreground-muted px-2.5 py-1 rounded-lg text-[10px] font-medium hover:text-foreground transition-colors">
              <ShoppingBag className="w-3 h-3" /> Website
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>

      {/* Intelligence Data */}
      <div className="p-5 space-y-4">

        {/* AI Insights */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-3 h-3 text-muted" />
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Intelligence Signals</p>
          </div>
          <div className="space-y-2">
            {competitor.insights.map((insight, i) => (
              <div key={i} className="flex gap-2.5 bg-surface-2 rounded-lg px-3 py-2">
                <div className="w-1 bg-accent/40 rounded-full flex-shrink-0" />
                <p className="text-xs text-foreground-muted leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Gaps Debackers can exploit */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Gaps You Can Exploit</p>
          </div>
          <div className="space-y-1.5">
            {competitor.gaps.map((gap, i) => (
              <div key={i} className="flex gap-2 bg-green-400/5 border border-green-400/10 rounded-lg px-3 py-2">
                <span className="text-green-400 text-xs font-bold flex-shrink-0">→</span>
                <p className="text-xs text-green-300 leading-relaxed">{gap}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active Campaigns */}
        {competitor.campaigns && competitor.campaigns.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 mb-2 w-full text-left"
            >
              <Play className="w-3 h-3 text-muted" />
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider flex-1">
                Detected Campaigns ({competitor.campaigns.length})
              </p>
              {expanded ? <ChevronDown className="w-3 h-3 text-muted" /> : <ChevronRight className="w-3 h-3 text-muted" />}
            </button>

            {expanded && (
              <div className="space-y-2">
                {competitor.campaigns.map((camp, i) => (
                  <div key={i} className="bg-surface-2 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-foreground">{camp.name}</p>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        camp.estimatedBudget.includes("High") ? "bg-red-400/10 text-red-400" :
                        camp.estimatedBudget.includes("Medium") ? "bg-amber-400/10 text-amber-400" :
                        "bg-green-400/10 text-green-400"
                      )}>
                        {camp.estimatedBudget}
                      </span>
                    </div>
                    <p className="text-[10px] text-foreground-muted mb-1.5">{camp.theme}</p>
                    {camp.offer && (
                      <p className="text-[10px] text-accent bg-accent/5 border border-accent/10 px-2 py-1 rounded">
                        Offer: {camp.offer}
                      </p>
                    )}
                    <div className="flex gap-1 mt-1.5">
                      {camp.platforms.map((p) => (
                        <span key={p} className="text-[9px] bg-surface text-foreground-muted px-1.5 py-0.5 rounded capitalize">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Themes */}
        <div>
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2">Content Themes</p>
          <div className="flex flex-wrap gap-1">
            {competitor.contentThemes.map((theme) => (
              <span key={theme} className="text-[10px] bg-surface-2 text-foreground-muted px-2 py-0.5 rounded-full capitalize border border-border">
                {theme}
              </span>
            ))}
          </div>
        </div>

        {/* Pricing Strategy */}
        <div className="bg-surface-2 rounded-lg p-3">
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1">Pricing Strategy</p>
          <p className="text-xs text-foreground-muted">{competitor.pricingStrategy}</p>
        </div>

      </div>
    </div>
  );
}

export default function CompetitorsPage() {
  const [data, setData] = useState<{ competitors: CompetitorIntelligence[]; marketGaps: string[]; brand: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/competitors")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="p-8 grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-96 bg-surface rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const { competitors = [], marketGaps = [] } = data ?? {};

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Competitor Intelligence"
        subtitle="Tie House · British House · Massimo Dutti — live research & gap analysis"
        badge="Live Data"
        action={
          <a
            href="https://www.facebook.com/ads/library/?country=EG&ad_type=all"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors"
          >
            <Megaphone className="w-4 h-4" />
            Meta Ad Library Egypt
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        }
      />

      <div className="p-8 space-y-6">

        {/* How to use Ad Library */}
        <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-400 mb-1">View Competitor Live Ads</p>
              <p className="text-xs text-foreground-muted mb-2">
                Click <strong>"View Live Ads"</strong> on any competitor below to open Meta Ad Library — see their exact running Facebook & Instagram ads right now. Free, no login needed.
              </p>
              <p className="text-[10px] text-muted">
                Meta Ad Library shows: ad creative, copy, when it started running, which countries it targets, estimated reach.
              </p>
            </div>
          </div>
        </div>

        {/* Market Gaps */}
        <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-bold text-green-400">Market Gaps — Debackers Opportunities</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {marketGaps.map((gap, i) => (
              <div key={i} className="flex gap-2 bg-green-400/5 rounded-lg p-3">
                <span className="text-green-400 font-bold text-xs flex-shrink-0">{i + 1}.</span>
                <p className="text-xs text-green-300 leading-relaxed">{gap}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{competitors.length}</p>
            <p className="text-xs text-muted mt-1">Competitors Tracked</p>
          </div>
          <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">1</p>
            <p className="text-xs text-muted mt-1">High Threat</p>
          </div>
          <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{marketGaps.length}</p>
            <p className="text-xs text-muted mt-1">Gaps Identified</p>
          </div>
          <div className="bg-surface border border-border/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">Live</p>
            <p className="text-xs text-muted mt-1">Ad Library Access</p>
          </div>
        </div>

        {/* Competitor Cards */}
        <div className="grid grid-cols-3 gap-5">
          {competitors.map((c) => <CompetitorCard key={c.name} competitor={c} />)}
        </div>

      </div>
    </div>
  );
}
