"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { cn, timeAgo } from "@/lib/utils";
import { CompetitorIntelligence } from "@/lib/competitor-intelligence";
import { COMPETITOR_BRANDS } from "@/lib/competitor-arabic";
import { GenerationError } from "@/components/ui/generation-error";
import { Sources, type Source } from "@/components/ui/sources";
import { SearchCreditsPill } from "@/components/layout/search-credits-pill";
import {
  ExternalLink, TrendingUp, Users,
  Eye, Instagram, Globe,
  Play, Megaphone, ShoppingBag, ChevronDown, ChevronRight, RefreshCw
} from "lucide-react";

// Social + Meta Ad Library links come from the shared brand registry.
const BRAND_BY_NAME = new Map(COMPETITOR_BRANDS.map((b) => [b.name, b]));

const SEGMENT_STYLES: Record<string, string> = {
  premium: "bg-purple-400/10 text-purple-300 border-purple-400/20",
  mass: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
};

const THREAT_COLORS = {
  high: "bg-red-400/10 border-red-400/20 text-red-400",
  medium: "bg-amber-400/10 border-amber-400/20 text-amber-400",
  low: "bg-green-400/10 border-green-400/20 text-green-400",
};

function CompetitorCard({ competitor }: { competitor: CompetitorIntelligence }) {
  const [expanded, setExpanded] = useState(false);
  const brand = BRAND_BY_NAME.get(competitor.name);
  const metaUrl = competitor.metaAdsUrl || brand?.metaAds || "#";
  const igUrl = brand?.instagram || "#";
  const ttUrl = brand?.tiktok || "#";

  return (
    <div className="bg-surface border border-border/50 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-sm font-bold text-foreground">{competitor.name}</h3>
              {competitor.segment && (
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase", SEGMENT_STYLES[competitor.segment])}>
                  {competitor.segment}
                </span>
              )}
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
            href={metaUrl}
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
          <a href={igUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 bg-pink-400/10 border border-pink-400/20 text-pink-400 px-2.5 py-1 rounded-lg text-[10px] font-medium hover:bg-pink-400/20 transition-colors">
            <Instagram className="w-3 h-3" /> Instagram
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a href={ttUrl} target="_blank" rel="noreferrer"
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

        {/* 🇪🇬 Arabic Intelligence — Egypt-first */}
        {(competitor.arabicSummary || competitor.arabicCampaignHook || competitor.arabicCounterAngle) && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider">🇪🇬 Arabic Intelligence</p>
              {competitor.signalCount !== undefined && (
                <span className="text-[9px] text-muted">· {competitor.signalCount} live signals</span>
              )}
            </div>
            {competitor.arabicSummary && (
              <div>
                <p className="text-[9px] text-muted mb-1">ملخص</p>
                <p dir="rtl" className="text-xs text-foreground font-arabic leading-relaxed">{competitor.arabicSummary}</p>
              </div>
            )}
            {competitor.arabicOfferInterpretation && (
              <div>
                <p className="text-[9px] text-muted mb-1">معنى العروض</p>
                <p dir="rtl" className="text-xs text-foreground-muted font-arabic leading-relaxed">{competitor.arabicOfferInterpretation}</p>
              </div>
            )}
            {competitor.arabicCounterAngle && (
              <div className="bg-green-400/5 border border-green-400/20 rounded-lg px-3 py-2">
                <p className="text-[9px] text-green-400 font-bold mb-1">رد ديباكرز</p>
                <p dir="rtl" className="text-xs text-green-300 font-arabic leading-relaxed">{competitor.arabicCounterAngle}</p>
              </div>
            )}
            {competitor.arabicCampaignHook && (
              <div>
                <p className="text-[9px] text-muted mb-1">هوك إعلاني جاهز</p>
                <p dir="rtl" className="text-sm text-foreground font-arabic bg-surface rounded-lg px-3 py-2">{competitor.arabicCampaignHook}</p>
              </div>
            )}
          </div>
        )}

        {/* Detected signals (deterministic — classified by code) */}
        {((competitor.offerSignals?.length ?? 0) > 0 || (competitor.garmentFocus?.length ?? 0) > 0 ||
          ((competitor.detectedKeywords?.ar.length ?? 0) + (competitor.detectedKeywords?.en.length ?? 0)) > 0) && (
          <div className="space-y-2.5">
            {competitor.offerSignals && competitor.offerSignals.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Offers detected</p>
                <div className="flex flex-wrap gap-1">
                  {competitor.offerSignals.slice(0, 6).map((o) => (
                    <span key={o.type} className="text-[9px] bg-red-400/10 text-red-300 border border-red-400/20 px-2 py-0.5 rounded-full capitalize">{o.type.replace("-", " ")} ×{o.count}</span>
                  ))}
                </div>
              </div>
            )}
            {competitor.garmentFocus && competitor.garmentFocus.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Garment focus</p>
                <div className="flex flex-wrap gap-1">
                  {competitor.garmentFocus.map((g) => (
                    <span key={g} className="text-[9px] bg-surface-2 text-foreground-muted px-2 py-0.5 rounded-full capitalize border border-border">{g}</span>
                  ))}
                </div>
              </div>
            )}
            {competitor.detectedKeywords && (competitor.detectedKeywords.ar.length + competitor.detectedKeywords.en.length) > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Keywords detected (AR + EN)</p>
                <div className="flex flex-wrap gap-1">
                  {competitor.detectedKeywords.ar.slice(0, 10).map((k, i) => (
                    <span key={`a${i}`} dir="rtl" className="text-[9px] bg-surface-2 text-foreground-muted px-2 py-0.5 rounded-full font-arabic border border-border">{k}</span>
                  ))}
                  {competitor.detectedKeywords.en.slice(0, 8).map((k, i) => (
                    <span key={`e${i}`} className="text-[9px] bg-surface-2 text-foreground-muted px-2 py-0.5 rounded-full border border-border">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Evidence — both languages, clickable */}
        {((competitor.arabicEvidence?.length ?? 0) > 0 || (competitor.englishEvidence?.length ?? 0) > 0) && (
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Evidence</p>
            <div className="space-y-1">
              {competitor.arabicEvidence?.slice(0, 2).map((e, i) => (
                <a key={`ae${i}`} href={e.url} target="_blank" rel="noreferrer" dir="rtl"
                  className="block text-[10px] text-foreground-muted font-arabic bg-surface-2 rounded px-2 py-1 hover:text-accent truncate">{e.text}</a>
              ))}
              {competitor.englishEvidence?.slice(0, 2).map((e, i) => (
                <a key={`ee${i}`} href={e.url} target="_blank" rel="noreferrer"
                  className="block text-[10px] text-foreground-muted bg-surface-2 rounded px-2 py-1 hover:text-accent truncate">{e.text}</a>
              ))}
            </div>
          </div>
        )}

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
  const [data, setData] = useState<{ competitors: CompetitorIntelligence[]; marketGaps: string[] } | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/competitors")
      .then((r) => r.json())
      .then((d) => {
        if (d.competitors?.length) { setData(d); setSources(d.sources ?? []); setGeneratedAt(d.generatedAt); }
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/competitors", { method: "POST" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(`Research failed: ${e.details || res.status}`);
      }
      const d = await res.json();
      setData(d);
      setSources(d.sources ?? []);
      setGeneratedAt(d.generatedAt);
      // Research just spent search credits — update the pill immediately.
      window.dispatchEvent(new Event("serper-usage-refresh"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const { competitors = [], marketGaps = [] } = data ?? {};

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Competitor Intelligence"
        subtitle="Live web research — what your competitors are doing right now"
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
              {loading ? "Researching live…" : competitors.length ? "Refresh research" : "Research competitors"}
            </button>
          </div>
        }
      />

      <div className="p-8 space-y-6">

        {generatedAt && (
          <p className="text-xs text-muted">🔄 Last researched {timeAgo(generatedAt)} · live web search · shared with your team</p>
        )}

        {competitors.length > 0 && <Sources sources={sources} />}

        {error && <GenerationError error={error} />}

        {!competitors.length && !loading && !error && (
          <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-accent mx-auto mb-4 opacity-50" />
            <p className="text-foreground font-semibold mb-2">No competitor research yet</p>
            <p className="text-sm text-muted mb-6">Click <strong>Research competitors</strong> — searches Egypt live web in <strong>Arabic &amp; English</strong> across 5 brands (Tie House, British House, Massimo Dutti, Town Team, LC Waikiki) and classifies their offers, garments &amp; campaign angles.</p>
          </div>
        )}

        {loading && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <RefreshCw className="w-6 h-6 text-accent animate-spin mx-auto mb-3" />
            <p className="text-foreground font-semibold">Searching the live web for competitor activity…</p>
          </div>
        )}

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
            <p className="text-2xl font-bold text-red-400">{competitors.filter((c) => c.threatLevel === "high").length}</p>
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
