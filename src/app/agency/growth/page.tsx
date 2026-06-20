"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ExternalLink,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Target,
  Truck,
  Users,
} from "lucide-react";
import { HelpButton } from "@/components/ui/help-button";

type Report = {
  isLive: boolean;
  generatedAt: string;
  source: string;
  window: { current: { from: string; to: string }; previous: { from: string; to: string } };
  summary: {
    current: { orders: number; grossSales: number; netSales: number; aov: number };
    previous: { orders: number; grossSales: number; netSales: number; aov: number };
    revenueGrowth: number | null;
    ordersGrowth: number | null;
    aovGrowth: number | null;
  };
  findings: Array<{
    type: string;
    title: string;
    evidence: string;
    action: string;
    confidence: number;
    productUrl?: string | null;
  }>;
  products: Array<{
    key: string;
    title: string;
    category: string;
    productId: number | null;
    url: string | null;
    revenue: number;
    units: number;
    aov: number;
    variants: number;
    inventoryTotal: number | null;
    stockRisk: boolean;
    previousRevenue: number;
    previousUnits: number;
    revenueChange: number | null;
    unitChange: number | null;
    isNew: boolean;
  }>;
  channels: Array<{ name: string; orders: number; revenue: number; previousRevenue: number; previousUnits: number; revenueChange: number | null; unitChange: number | null; isNew: boolean }>;
  cities: Array<{ name: string; orders: number; revenue: number; previousRevenue: number; previousUnits: number; revenueChange: number | null; unitChange: number | null; isNew: boolean }>;
  categories: Array<{ name: string; units: number; revenue: number; previousRevenue: number; previousUnits: number; revenueChange: number | null; unitChange: number | null; isNew: boolean }>;
  pendingOrders: Array<{ name: string; createdAt: string; financialStatus: string; fulfillmentStatus: string; total: number; city: string | null }>;
  pendingWindow?: { from: string; to: string; label: string };
  dataLimits: string[];
  error?: string;
};

function money(value: number) {
  return `EGP ${Math.round(value || 0).toLocaleString("en-EG")}`;
}

function change(value: number | null) {
  if (value === null) return "New / no baseline";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function changeClass(value: number | null) {
  if (value === null) return "text-blue-400";
  if (value > 0) return "text-green-400";
  if (value < 0) return "text-red-400";
  return "text-muted";
}

function Confidence({ value }: { value: number }) {
  const color = value >= 85 ? "text-green-400 bg-green-500/10" : value >= 70 ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10";
  return <span className={`text-xs font-bold px-2 py-1 rounded ${color}`}>{value}%</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-EG", { day: "numeric", month: "short" });
}

function groupProductsByCategory(products: Report["products"]) {
  return Object.entries(
    products.reduce<Record<string, Report["products"]>>((acc, product) => {
      acc[product.category] = acc[product.category] || [];
      acc[product.category].push(product);
      return acc;
    }, {})
  )
    .map(([category, rows]) => ({
      category,
      rows,
      revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
      units: rows.reduce((sum, row) => sum + row.units, 0),
      stockRisks: rows.filter((row) => row.stockRisk).length,
    }))
    .sort((a, b) => b.units - a.units);
}

function topByUnits(rows: Report["products"]) {
  return [...rows].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 5);
}

function slowByUnits(rows: Report["products"]) {
  return [...rows].sort((a, b) => a.units - b.units || a.revenue - b.revenue).slice(0, 5);
}

export default function GrowthAccelerationReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agency/growth");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load live growth report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Growth Acceleration Report</h1>
              <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">LIVE SHOPIFY</span>
              <HelpButton section="/agency/weekly" />
            </div>
            <p className="text-sm text-muted">Root causes, product links, geography, channel signals, and actions from authenticated Shopify data.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link href="/agency" className="text-xs text-accent hover:underline flex items-center gap-1">
            Back to reports <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {loading && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <RefreshCw className="w-6 h-6 text-accent animate-spin mx-auto mb-3" />
          <p className="text-sm text-foreground">Pulling raw Shopify orders and products...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-5 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400 mb-1">Live report failed</p>
            <p className="text-sm text-foreground-muted">{error}</p>
          </div>
        </div>
      )}

      {report && !loading && (
        <>
          <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-400 mb-1">Authenticated live Shopify data</p>
                <p className="text-sm text-foreground-muted">
                  Source: {report.source}. Current window {formatDate(report.window.current.from)} to {formatDate(report.window.current.to)} compared with previous equal 7-day period.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">Net sales</p>
              <p className="text-xl font-bold text-accent">{money(report.summary.current.netSales)}</p>
              <p className={`text-xs mt-2 ${changeClass(report.summary.revenueGrowth)}`}>{change(report.summary.revenueGrowth)} vs previous</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">Orders</p>
              <p className="text-xl font-bold text-foreground">{report.summary.current.orders.toLocaleString("en-EG")}</p>
              <p className={`text-xs mt-2 ${changeClass(report.summary.ordersGrowth)}`}>{change(report.summary.ordersGrowth)} vs previous</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">AOV</p>
              <p className="text-xl font-bold text-foreground">{money(report.summary.current.aov)}</p>
              <p className={`text-xs mt-2 ${changeClass(report.summary.aovGrowth)}`}>{change(report.summary.aovGrowth)} vs previous</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">Pending/unfulfilled</p>
              <p className="text-xl font-bold text-foreground">{report.pendingOrders.length}</p>
              <p className="text-xs text-muted mt-2">{report.pendingWindow?.label || "Last 24 hours"} needing follow-up</p>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-accent" /> Root causes and acceleration actions
            </h2>
            <div className="space-y-3">
              {report.findings.map((item, i) => (
                <div key={`${item.title}-${i}`} className="bg-surface-2 border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{i + 1}. {item.title}</p>
                      <p className="text-xs text-muted mt-1">{item.evidence}</p>
                    </div>
                    <Confidence value={item.confidence} />
                  </div>
                  <p className="text-sm text-green-400 mt-2">Action: {item.action}</p>
                  {item.productUrl && (
                    <a href={item.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-2">
                      Open product <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-1">
              <PackageCheck className="w-4 h-4 text-accent" /> Product movement by category
            </h2>
            <p className="text-xs text-muted mb-4">Ranked by pieces sold, not revenue. Slow movers are the lowest unit sellers in the selected 7-day window.</p>
            <div className="space-y-3">
              {groupProductsByCategory(report.products).map((group, index) => (
                <details key={group.category} className="bg-surface-2 border border-border rounded-xl p-4" open={index < 3}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{group.category}</p>
                        <p className="text-xs text-muted mt-1">
                          {money(group.revenue)} - {group.units} units - {group.rows.length} product families
                        </p>
                      </div>
                      <span className="text-xs text-accent">Open list</span>
                    </div>
                  </summary>
                  <div className="overflow-x-auto mt-4">
                    <div className="grid lg:grid-cols-2 gap-5">
                      <ProductMovementTable title="Top 5 sellers by pieces" rows={topByUnits(group.rows)} />
                      <ProductMovementTable title="Top 5 slow movers by pieces" rows={slowByUnits(group.rows)} />
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <Breakdown title="Channels" icon={<Users className="w-4 h-4 text-accent" />} rows={report.channels} metric="orders" />
            <Breakdown title="Cities / regions" icon={<MapPin className="w-4 h-4 text-accent" />} rows={report.cities} metric="orders" />
            <Breakdown title="Categories" icon={<BarChart3 className="w-4 h-4 text-accent" />} rows={report.categories} metric="units" />
          </div>

          {report.pendingOrders.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-accent" /> Pending/unfulfilled orders to recover - last rolling 24 hours
              </h2>
              <div className="grid gap-2">
                {report.pendingOrders.map((order) => (
                  <div key={order.name} className="grid grid-cols-5 gap-3 bg-surface-2 border border-border rounded-lg p-3 text-xs">
                    <span className="font-bold text-foreground">{order.name}</span>
                    <span className="text-muted">{new Date(order.createdAt).toLocaleDateString("en-EG")}</span>
                    <span className="text-yellow-400">{order.financialStatus}</span>
                    <span className="text-muted">{order.fulfillmentStatus}</span>
                    <span className="text-foreground">{money(order.total)} {order.city ? `- ${order.city}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-5 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-yellow-400 mb-1">Data limits shown deliberately</p>
              <div className="space-y-1">
                {report.dataLimits.map((limit) => (
                  <p key={limit} className="text-sm text-foreground-muted">{limit}</p>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProductMovementTable({ title, rows }: { title: string; rows: Report["products"] }) {
  return (
    <div>
      <p className="text-xs font-bold text-foreground mb-2">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted border-b border-border">
            <th className="py-2 pr-3">Product family</th>
            <th className="py-2 pr-3">Units</th>
            <th className="py-2 pr-3">Revenue</th>
            <th className="py-2 pr-3">Unit change</th>
            <th className="py-2 pr-3">Link</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={`${title}-${p.key}`} className="border-b border-border/60">
              <td className="py-3 pr-3 text-foreground font-medium">{p.title}</td>
              <td className="py-3 pr-3 text-foreground font-bold">{p.units}</td>
              <td className="py-3 pr-3 text-foreground">{money(p.revenue)}</td>
              <td className={`py-3 pr-3 ${changeClass(p.unitChange)}`}>{change(p.unitChange)}</td>
              <td className="py-3 pr-3">
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                ) : <span className="text-muted">No link</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Breakdown({ title, icon, rows, metric }: { title: string; icon: React.ReactNode; rows: any[]; metric: "orders" | "units" }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">{icon} {title}</h2>
      <div className="space-y-2">
        {rows.slice(0, 6).map((row) => (
          <div key={row.name} className="bg-surface-2 border border-border rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{row.name}</p>
              {row.isNew && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">NEW</span>}
            </div>
            <p className="text-xs text-muted mt-1">
              {money(row.revenue)} - {row[metric] ?? row.orders ?? row.units} {metric}
            </p>
            <p className={`text-xs mt-1 ${changeClass(row.revenueChange)}`}>{change(row.revenueChange)} revenue</p>
          </div>
        ))}
      </div>
    </div>
  );
}
