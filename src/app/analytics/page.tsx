"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { mockSalesData, mockCampaigns } from "@/lib/mock-data";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";
import { formatNumber } from "@/lib/utils";

const PLATFORM_DATA = [
  { platform: "Instagram", reach: 85000, engagement: 4200, conversions: 180 },
  { platform: "TikTok", reach: 120000, engagement: 8500, conversions: 95 },
  { platform: "Facebook", reach: 45000, engagement: 1800, conversions: 210 },
  { platform: "Email", reach: 8500, engagement: 1200, conversions: 145 },
];

const AUDIENCE_SEGMENTS = [
  { name: "Women 18–25", value: 32, color: "#f59e0b" },
  { name: "Women 26–35", value: 28, color: "#fb923c" },
  { name: "Men 18–25", value: 20, color: "#a78bfa" },
  { name: "Men 26–35", value: 13, color: "#34d399" },
  { name: "Other 35–45", value: 7, color: "#60a5fa" },
];

const CAMPAIGN_PERFORMANCE = mockCampaigns.map((c) => ({
  name: c.name.split(" ").slice(0, 2).join(" "),
  predicted: c.estimatedKPIs.revenue,
  actual: Math.floor(c.estimatedKPIs.revenue * (0.75 + Math.random() * 0.5)),
  confidence: c.confidenceScore,
}));

const WEEKLY_TRAFFIC = [
  { day: "Sat", sessions: 1820, orders: 45 },
  { day: "Sun", sessions: 2100, orders: 52 },
  { day: "Mon", sessions: 1450, orders: 32 },
  { day: "Tue", sessions: 1320, orders: 28 },
  { day: "Wed", sessions: 1580, orders: 35 },
  { day: "Thu", sessions: 2450, orders: 68 },
  { day: "Fri", sessions: 3100, orders: 89 },
];

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="Analytics Overview"
        subtitle="Cross-platform performance and audience intelligence"
        badge="30-Day View"
      />

      <div className="p-8 space-y-8">

        {/* Revenue Line */}
        <div className="bg-surface border border-border/50 rounded-xl p-5">
          <SectionTitle title="Revenue & Orders — Last 30 Days" sub="Daily performance across all channels" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockSalesData.revenueByDay}>
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
              <YAxis tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                formatter={(v: number, name: string) => [name === "revenue" ? `EGP ${v.toLocaleString()}` : v, name === "revenue" ? "Revenue" : "Orders"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#aRevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Platform + Audience */}
        <div className="grid grid-cols-2 gap-6">

          {/* Platform Performance */}
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <SectionTitle title="Platform Performance" sub="Reach, engagement, and conversions by platform" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={PLATFORM_DATA}>
                <XAxis dataKey="platform" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 10, color: "#71717a" }} />
                <Bar dataKey="reach" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Reach" />
                <Bar dataKey="engagement" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Engagement" />
                <Bar dataKey="conversions" fill="#34d399" radius={[4, 4, 0, 0]} name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Audience Segments */}
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <SectionTitle title="Audience Segments" sub="Revenue contribution by demographic" />
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
        </div>

        {/* Weekly Traffic Pattern */}
        <div className="bg-surface border border-border/50 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <SectionTitle title="Weekly Traffic Pattern" sub="Sessions and orders by day of week" />
            <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-1.5">
              <p className="text-[10px] text-accent font-medium">💡 Insight: Thursday & Friday = 48% of weekly orders</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={WEEKLY_TRAFFIC}>
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="sessions" fill="#3f3f46" radius={[4, 4, 0, 0]} name="Sessions" />
              <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign Predicted vs Actual */}
        <div className="bg-surface border border-border/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle title="Campaign Learning Engine" sub="Predicted vs Actual revenue — learning from performance gaps" />
            <Badge variant="accent">Learning Active</Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CAMPAIGN_PERFORMANCE} layout="vertical">
              <XAxis type="number" tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `EGP ${formatNumber(v)}`} />
              <YAxis dataKey="name" type="category" tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`EGP ${v.toLocaleString()}`, ""]} />
              <Legend wrapperStyle={{ fontSize: 10, color: "#71717a" }} />
              <Bar dataKey="predicted" fill="#3f3f46" radius={[0, 4, 4, 0]} name="Predicted Revenue" />
              <Bar dataKey="actual" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Actual Revenue" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Learning Signal", value: "Active — 3 campaigns compared", color: "text-green-400" },
              { label: "Accuracy Rate", value: "78% prediction accuracy", color: "text-accent" },
              { label: "Next Improvement", value: "TikTok conversions underestimated", color: "text-purple-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-surface-2 rounded-lg p-3">
                <p className="text-[10px] text-muted mb-1">{label}</p>
                <p className={`text-xs font-medium ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
