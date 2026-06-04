"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Zap,
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
    repeatPurchaseRate: number;
    abandonedCarts: number;
    recoveryOpportunity: number;
  };
  isLive: boolean;
  dataError: string | null;
  rangeFrom: string;
  rangeTo: string;
  seasonalContext: {
    current: string;
    upcoming: { season: string; daysAway: number }[];
    recommendations: string[];
  };
  recentInsights: string[];
  topProducts: { name: string; revenue: number; units: number }[];
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
  const [range, setRange] = useState<DateRange>({ from: null, to: null });

  useEffect(() => {
    setLoading(true);
    const qs = range.from && range.to ? `?from=${range.from}&to=${range.to}` : "";
    fetch(`/api/dashboard${qs}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  if (!data) {
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

  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString("en-EG", { day: "numeric", month: "short", year: "numeric" });
  const rangeLabel = data.rangeFrom && data.rangeTo ? `${fmtDay(data.rangeFrom)} → ${fmtDay(data.rangeTo)}` : "";

  const { stats, isLive, seasonalContext, recentInsights, topProducts, revenueByDay } = data;
  const currentSeason = SEASON_LABELS[seasonalContext.current] ?? seasonalContext.current;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Campaign Intelligence Dashboard"
        subtitle={`Egyptian Fashion Market · ${new Date().toLocaleDateString("en-EG", { month: "long", year: "numeric" })}`}
        badge={isLive ? "🟢 Live Shopify" : "🔴 Couldn't load"}
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

        {/* Date range — what window these numbers cover */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Showing data for</span>
            <span className="text-sm font-semibold text-foreground">{rangeLabel}</span>
            {loading && <span className="text-xs text-accent animate-pulse">updating…</span>}
          </div>
          <DateRangePicker value={range} onChange={setRange} />
        </div>

        {/* Honest error — shown instead of fake numbers when the live pull fails */}
        {data.dataError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
            Couldn&apos;t load live Shopify data for this range: {data.dataError}. Numbers below are zero, not estimated — try again in a moment.
          </div>
        )}

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
            label="Net Sales"
            value={`EGP ${stats.totalRevenue.toLocaleString("en-EG")}`}
            change={stats.revenueGrowth}
            sub="Selected range · matches Shopify Net sales"
            icon={<ShoppingCart className="w-4 h-4 text-accent" />}
            accent
          />
          <StatCard
            label="Total Orders"
            value={stats.totalOrders.toLocaleString()}
            change={stats.ordersGrowth}
            sub="Selected range"
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
            label="Repeat Buyers"
            value={`${stats.repeatPurchaseRate}%`}
            sub="Customers with 2+ orders"
            icon={<Zap className="w-4 h-4 text-foreground-muted" />}
          />
        </div>

        {/* Revenue Chart + Insights */}
        <div className="grid grid-cols-3 gap-6">

          {/* Chart */}
          <div className="col-span-2 bg-surface border border-border/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Revenue by day</h2>
                <p className="text-xs text-muted mt-0.5">Daily revenue in EGP · selected range</p>
              </div>
              <Badge variant={stats.revenueGrowth >= 0 ? "success" : "warning"}>
                {stats.revenueGrowth >= 0 ? "+" : ""}{stats.revenueGrowth}% vs prev period
              </Badge>
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

        {/* Top Products + Store Health — all live from Shopify */}
        <div className="grid grid-cols-2 gap-6">

          {/* Top Products (live Shopify bestsellers) */}
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">Top Products</h2>
                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">🟢 LIVE</span>
              </div>
              <Link href="/sales" className="text-xs text-accent hover:underline">View all</Link>
            </div>
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="w-8 h-8 text-muted mb-2" />
                <p className="text-sm text-foreground-muted">No sales in the last 30 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg">
                    <span className="text-xs font-bold text-accent w-5 flex-shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted">{p.units} sold</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Store Health (live Shopify metrics) */}
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-foreground">Store Health</h2>
              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">🟢 LIVE</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                <span className="text-sm text-foreground-muted">Repeat buyers</span>
                <span className="text-sm font-semibold text-foreground">{stats.repeatPurchaseRate}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                <span className="text-sm text-foreground-muted">Abandoned carts (30d)</span>
                <span className="text-sm font-semibold text-foreground">{stats.abandonedCarts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                <span className="text-sm text-foreground-muted">Recovery opportunity</span>
                <span className="text-sm font-semibold text-foreground">{formatCurrency(stats.recoveryOpportunity)}</span>
              </div>
            </div>
            <Link href="/sales" className="flex items-center gap-1 text-xs text-accent mt-4 hover:underline">
              Full sales breakdown <ChevronRight className="w-3 h-3" />
            </Link>
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
