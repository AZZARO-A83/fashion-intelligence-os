"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from "recharts";
import { SalesData } from "@/types";

type SalesView = SalesData & { isLive?: boolean; rangeFrom?: string; rangeTo?: string };

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-EG", { day: "numeric", month: "short", year: "numeric" });
}


export default function SalesPage() {
  const [data, setData] = useState<SalesView | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setRefreshing(true);
    fetch("/api/sales")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-surface rounded-xl" />)}
        </div>
        <div className="h-64 bg-surface rounded-xl" />
      </div>
    );
  }

  const chartData = data.revenueByDay.slice(-14).map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en", { day: "2-digit", month: "short" }),
  }));

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Shopify Sales Intelligence"
        subtitle="Data-driven insights from your store performance"
        badge="Shopify Connected"
        action={
          <button
            onClick={load}
            className="flex items-center gap-2 bg-surface-2 border border-border text-foreground-muted px-3 py-2 rounded-lg text-xs hover:text-foreground transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh data
          </button>
        }
      />

      <div className="p-8 space-y-8">

        {/* Date range */}
        {data.rangeFrom && data.rangeTo && (
          <p className="text-xs text-muted">
            Showing <span className="text-foreground font-semibold">{fmtDay(data.rangeFrom)} → {fmtDay(data.rangeTo)}</span> · live from Shopify
          </p>
        )}

        {/* KPI Grid — all exact, all real */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Net Sales" value={`EGP ${data.totalRevenue.toLocaleString("en-EG")}`} change={data.weeklyGrowth} sub="Matches Shopify Net sales" accent />
          <StatCard label="Total Orders" value={data.totalOrders.toLocaleString()} sub="Selected range" />
          <StatCard label="Avg Order Value" value={`EGP ${data.avgOrderValue.toLocaleString("en-EG")}`} sub="Net sales ÷ non-cancelled orders (≈Shopify)" />
          <StatCard label="Repeat Buyers" value={`${data.repeatPurchaseRate}%`} sub="Customers with 2+ orders" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Abandoned Carts" value={data.abandonedCarts.toLocaleString()} sub="Last 30 days" />
          <StatCard label="Recovery Opportunity" value={`EGP ${(data.recoveryOpportunity ?? 0).toLocaleString("en-EG")}`} sub="≈15% of abandoned value" accent />
          <StatCard label="Growth vs prev period" value={`${data.weeklyGrowth >= 0 ? "+" : ""}${data.weeklyGrowth}%`} sub="Net sales, same-length prior" />
          <StatCard label="Orders growth" value={`${(data.ordersGrowth ?? 0) >= 0 ? "+" : ""}${data.ordersGrowth ?? 0}%`} sub="vs prev period" />
        </div>

        {/* Revenue Chart */}
        <div className="bg-surface border border-border/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Revenue Trend — recent days</h2>
              <p className="text-xs text-muted mt-0.5">Daily revenue (order total) in the selected range</p>
            </div>
            <Badge variant={data.weeklyGrowth >= 0 ? "success" : "danger"}>
              {data.weeklyGrowth >= 0 ? "+" : ""}{data.weeklyGrowth}% vs prev period
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#71717a" }}
                formatter={(v: number) => [`EGP ${v.toLocaleString()}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products + Low Performers */}
        <div className="grid grid-cols-2 gap-6">

          {/* Top Products */}
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Top Performing Products</h2>
            <div className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg">
                  <span className="text-xs font-bold text-muted w-5 text-center">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted mt-0.5">{p.units} units · EGP {p.revenue.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-xs font-medium text-green-400">+{p.growth}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products Bar Chart */}
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Revenue by Product</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topProducts} layout="vertical">
                <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} width={130}
                  tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v}
                />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`EGP ${v.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Performers */}
        <div className="bg-surface border border-border/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-foreground">Low Performing Products</h2>
            <Badge variant="danger">Action needed</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {data.lowProducts.map((p, i) => (
              <div key={i} className="p-4 bg-red-400/5 border border-red-400/20 rounded-lg">
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted mt-1">EGP {p.revenue.toLocaleString()} · {p.units} units</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingDown className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">{p.growth}% decline</span>
                </div>
                <p className="text-[10px] text-muted mt-2">
                  {p.growth < -30 ? "Consider markdown or bundle promotion" : "Monitor — seasonal dip expected"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* AI insights moved to Analytics tab — see /analytics */}

      </div>
    </div>
  );
}
