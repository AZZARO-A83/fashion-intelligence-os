"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ui/score-ring";
import { formatCurrency, formatNumber, platformIcon } from "@/lib/utils";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Zap,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";

interface DashboardData {
  stats: {
    totalRevenue: number;
    revenueGrowth: number;
    totalOrders: number;
    ordersGrowth: number;
    avgOrderValue: number;
    aovGrowth: number;
    activeCampaigns: number;
    topTrend: string;
    trendScore: number;
  };
  seasonalContext: {
    current: string;
    upcoming: { season: string; daysAway: number }[];
    recommendations: string[];
  };
  recentInsights: string[];
  topTrends: { name: string; platform: string; trendScore: number; growthRate: number }[];
  activeCampaigns: { name: string; confidenceScore: number; platforms: string[] }[];
  revenueByDay: { date: string; revenue: number; orders: number }[];
}

const SEASON_LABELS: Record<string, string> = {
  ramadan: "Ramadan",
  eid_fitr: "Eid Al-Fitr",
  eid_adha: "Eid Al-Adha",
  summer: "Summer",
  winter: "Winter",
  back_to_school: "Back to School",
  black_friday: "Black Friday",
  wedding_season: "Wedding Season",
  normal: "Regular Season",
};

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-2 border border-border rounded-lg p-3 text-xs shadow-xl">
        <p className="text-muted mb-1">{label}</p>
        <p className="text-accent font-semibold">EGP {payload[0].value.toLocaleString()}</p>
        <p className="text-foreground-muted">{payload[1]?.value} orders</p>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-surface rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-surface rounded-xl" />
      </div>
    );
  }

  const { stats, seasonalContext, recentInsights, topTrends, activeCampaigns, revenueByDay } = data;
  const currentSeason = SEASON_LABELS[seasonalContext.current] ?? seasonalContext.current;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Campaign Intelligence Dashboard"
        subtitle={`Egyptian Fashion Market · ${new Date().toLocaleDateString("en-EG", { month: "long", year: "numeric" })}`}
        badge="Live"
        action={
          <Link
            href="/campaigns"
            className="flex items-center gap-2 bg-accent text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-light transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generate Campaigns
          </Link>
        }
      />

      <div className="p-8 space-y-8">

        {/* Seasonal Alert */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-start gap-4">
          <Calendar className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-accent">Current Season: {currentSeason}</span>
              {seasonalContext.upcoming[0] && (
                <Badge variant="warning">
                  {SEASON_LABELS[seasonalContext.upcoming[0].season]} in {seasonalContext.upcoming[0].daysAway} days
                </Badge>
              )}
            </div>
            <p className="text-xs text-foreground-muted">{seasonalContext.recommendations[0]}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Monthly Revenue"
            value={`EGP ${formatNumber(stats.totalRevenue)}`}
            change={stats.revenueGrowth}
            sub="Last 30 days"
            icon={<ShoppingCart className="w-4 h-4 text-accent" />}
            accent
          />
          <StatCard
            label="Total Orders"
            value={stats.totalOrders.toLocaleString()}
            change={stats.ordersGrowth}
            sub="Last 30 days"
            icon={<Package className="w-4 h-4 text-foreground-muted" />}
          />
          <StatCard
            label="Avg Order Value"
            value={`EGP ${stats.avgOrderValue}`}
            change={stats.aovGrowth}
            sub="Per transaction"
            icon={<TrendingUp className="w-4 h-4 text-foreground-muted" />}
          />
          <StatCard
            label="Top Trend Score"
            value={`${stats.trendScore}/100`}
            sub={stats.topTrend}
            icon={<Zap className="w-4 h-4 text-foreground-muted" />}
          />
        </div>

        {/* Revenue Chart + Insights */}
        <div className="grid grid-cols-3 gap-6">

          {/* Chart */}
          <div className="col-span-2 bg-surface border border-border/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Revenue (Last 7 Days)</h2>
                <p className="text-xs text-muted mt-0.5">Daily revenue in EGP</p>
              </div>
              <Badge variant="success">+{stats.revenueGrowth}% WoW</Badge>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueByDay} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en", { weekday: "short" })}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* AI Insights */}
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">AI Insights</h2>
            </div>
            <div className="space-y-3">
              {recentInsights.slice(0, 4).map((insight, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="w-1 bg-accent/40 rounded-full flex-shrink-0 mt-1" />
                  <p className="text-xs text-foreground-muted leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
            <Link href="/sales" className="flex items-center gap-1 text-xs text-accent mt-4 hover:underline">
              View full analysis <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Trends + Campaigns */}
        <div className="grid grid-cols-2 gap-6">

          {/* Top Trends */}
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Top Trends Now</h2>
              <Link href="/trends" className="text-xs text-accent hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {topTrends.map((trend, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg">
                  <span className="text-base">{platformIcon(trend.platform)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{trend.name}</p>
                    <p className="text-xs text-muted capitalize">{trend.platform} · +{trend.growthRate}% growth</p>
                  </div>
                  <ScoreRing score={trend.trendScore} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Active Campaigns</h2>
              <Link href="/campaigns" className="text-xs text-accent hover:underline">View all</Link>
            </div>
            {activeCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-8 h-8 text-muted mb-2" />
                <p className="text-sm text-foreground-muted">No active campaigns</p>
                <Link
                  href="/campaigns"
                  className="mt-3 text-xs text-accent hover:underline flex items-center gap-1"
                >
                  Generate this month's plan <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCampaigns.map((camp, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg">
                    <ScoreRing score={camp.confidenceScore} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{camp.name}</p>
                      <div className="flex gap-1 mt-1">
                        {camp.platforms.map((p) => (
                          <span key={p} className="text-[10px] text-muted">{platformIcon(p)}</span>
                        ))}
                      </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Seasonal Recommendations */}
        <div className="bg-surface border border-border/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Seasonal Playbook — {currentSeason}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {seasonalContext.recommendations.slice(0, 6).map((rec, i) => (
              <div key={i} className="flex gap-2.5 p-3 bg-surface-2 rounded-lg">
                <span className="text-accent font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}.</span>
                <p className="text-xs text-foreground-muted leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
