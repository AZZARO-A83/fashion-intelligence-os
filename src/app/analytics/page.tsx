"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { SalesData } from "@/types";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";
import { formatNumber } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

// ─── Data badges ──────────────────────────────────────────────────────
function LiveBadge() {
  return <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">🟢 LIVE</span>;
}
function MockBadge({ reason }: { reason: string }) {
  return (
    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold" title={reason}>
      🔴 MOCK
    </span>
  );
}

// ─── Mock data — clearly labeled, waiting for social API connections ──
const PLATFORM_DATA = [
  { platform: "Instagram", reach: 85000, engagement: 4200, conversions: 180 },
  { platform: "TikTok",    reach: 120000, engagement: 8500, conversions: 95 },
  { platform: "Facebook",  reach: 45000,  engagement: 1800, conversions: 210 },
  { platform: "Email",     reach: 8500,   engagement: 1200, conversions: 145 },
];

const AUDIENCE_SEGMENTS = [
  { name: "Women 18–25", value: 32, color: "#f59e0b" },
  { name: "Women 26–35", value: 28, color: "#fb923c" },
  { name: "Men 18–25",   value: 20, color: "#a78bfa" },
  { name: "Men 26–35",   value: 13, color: "#34d399" },
  { name: "Other 35–45", value: 7,  color: "#60a5fa" },
];

function SectionTitle({ title, sub, badge }: { title: string; sub?: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
      {badge}
    </div>
  );
}

// ─── Derive weekly pattern from real orders ───────────────────────────
function buildWeeklyPattern(revenueByDay: { date: string; revenue: number; orders: number }[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totals: Record<string, { orders: number; count: number }> = {};
  days.forEach(d => { totals[d] = { orders: 0, count: 0 }; });

  revenueByDay.forEach(({ date, orders }) => {
    const dayName = days[new Date(date).getDay()];
    totals[dayName].orders += orders;
    totals[dayName].count += 1;
  });

  return days.map(d => ({
    day: d,
    orders: totals[d].count > 0 ? Math.round(totals[d].orders / totals[d].count) : 0,
  }));
}

export default function AnalyticsPage() {
  const [data, setData] = useState<(SalesData & { dataSource?: string; dataNote?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/sales");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Analytics load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isLive = data?.dataSource === "live";
  const weeklyPattern = data?.revenueByDay ? buildWeeklyPattern(data.revenueByDay) : [];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Analytics Overview"
        subtitle="Cross-platform performance and audience intelligence"
        badge="30-Day View"
        action={
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-xs text-muted hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="p-8 space-y-8">

        {/* Data source notice */}
        {data?.dataNote && (
          <div className={`rounded-xl border p-3 text-xs ${isLive ? "bg-green-500/5 border-green-500/20 text-green-400" : "bg-red-500/5 border-red-500/20 text-red-400"}`}>
            {data.dataNote}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Revenue & Orders — REAL from Shopify */}
            <div className="bg-surface border border-border/50 rounded-xl p-5">
              <SectionTitle
                title="Revenue & Orders — Last 30 Days"
                sub="Daily performance from Shopify"
                badge={isLive ? <LiveBadge /> : <MockBadge reason="Connect Shopify to see real data" />}
              />
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-[10px] text-muted mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-accent">EGP {data.totalRevenue?.toLocaleString()}</p>
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-[10px] text-muted mb-1">Total Orders</p>
                  <p className="text-xl font-bold text-foreground">{data.totalOrders?.toLocaleString()}</p>
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-[10px] text-muted mb-1">Avg Order Value</p>
                  <p className="text-xl font-bold text-foreground">EGP {data.avgOrderValue?.toLocaleString()}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.revenueByDay}>
                  <defs>
                    <linearGradient id="aRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("en", { day: "2-digit", month: "short" })}
                    interval={4}
                  />
                  <YAxis tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [
                      name === "revenue" ? `EGP ${v.toLocaleString()}` : v,
                      name === "revenue" ? "Revenue" : "Orders"
                    ]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#aRevGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top Products — REAL from Shopify */}
            <div className="bg-surface border border-border/50 rounded-xl p-5">
              <SectionTitle
                title="Top Products by Revenue"
                sub="Best sellers from your Shopify store"
                badge={isLive ? <LiveBadge /> : <MockBadge reason="Connect Shopify to see real products" />}
              />
              <div className="space-y-2">
                {data.topProducts?.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg">
                    <span className="text-xs font-bold text-accent w-5">{i + 1}.</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">{p.name}</p>
                      <p className="text-[10px] text-muted">{p.units} units sold</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">EGP {p.revenue.toLocaleString()}</p>
                    {p.growth !== 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.growth > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {p.growth > 0 ? "+" : ""}{p.growth}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Traffic Pattern — derived from real orders */}
            {weeklyPattern.some(d => d.orders > 0) && (
              <div className="bg-surface border border-border/50 rounded-xl p-5">
                <SectionTitle
                  title="Weekly Order Pattern"
                  sub="Orders by day of week — derived from your real Shopify orders"
                  badge={isLive ? <LiveBadge /> : <MockBadge reason="Connect Shopify for real pattern" />}
                />
                <div className="bg-accent/5 border border-accent/20 rounded-lg px-3 py-1.5 mb-4 inline-block">
                  <p className="text-[10px] text-accent font-medium">💡 Insight: Thursday & Friday = peak order days in Egypt</p>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyPattern}>
                    <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Avg Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Platform Performance — MOCK until Meta + TikTok APIs connected */}
            <div className="bg-surface border border-border/50 rounded-xl p-5">
              <SectionTitle
                title="Platform Performance"
                sub="Reach, engagement, and conversions by platform"
                badge={<MockBadge reason="Connect Meta Ads + TikTok API for real data" />}
              />
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-400">⚠️ This data is placeholder. Connect your Meta Ads account and TikTok API to see real platform performance.</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={PLATFORM_DATA}>
                  <XAxis dataKey="platform" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, color: "#71717a" }} />
                  <Bar dataKey="reach" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Reach" />
                  <Bar dataKey="engagement" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Engagement" />
                  <Bar dataKey="conversions" fill="#34d399" radius={[4, 4, 0, 0]} name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Audience Segments — MOCK until Meta API connected */}
            <div className="bg-surface border border-border/50 rounded-xl p-5">
              <SectionTitle
                title="Audience Segments"
                sub="Revenue contribution by demographic"
                badge={<MockBadge reason="Connect Meta Ads API for real audience data" />}
              />
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-400">⚠️ Placeholder segments. Real data available after Meta Ads integration.</p>
              </div>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={AUDIENCE_SEGMENTS} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {AUDIENCE_SEGMENTS.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [`${v}%`, "Share"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {AUDIENCE_SEGMENTS.map((seg) => (
                    <div key={seg.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs text-foreground-muted flex-1">{seg.name}</span>
                      <span className="text-xs font-bold text-foreground">{seg.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insights — real if Groq key set */}
            {data.insights && data.insights.length > 0 && (
              <div className="bg-surface border border-border/50 rounded-xl p-5">
                <SectionTitle
                  title="AI Sales Insights"
                  sub="Claude-analyzed patterns from your sales data"
                  badge={<span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold">🔵 AI RESEARCH</span>}
                />
                <div className="space-y-3">
                  {data.insights.map((insight: { metric?: string; value?: string; change?: number; explanation?: string } | string, i: number) => (
                    <div key={i} className="bg-surface-2 rounded-lg p-4 flex gap-3">
                      <div className="w-1.5 rounded-full flex-shrink-0 bg-accent" />
                      <div>
                        {typeof insight === "object" && insight.metric && (
                          <p className="text-xs font-semibold text-foreground mb-1">{insight.metric}: {insight.value}</p>
                        )}
                        <p className="text-xs text-foreground-muted leading-relaxed">
                          {typeof insight === "string" ? insight : insight.explanation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <p className="text-muted text-sm">Failed to load analytics data</p>
          </div>
        )}

      </div>
    </div>
  );
}
