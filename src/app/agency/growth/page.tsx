"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquareText,
  PackageCheck,
  RefreshCw,
  Search,
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
  window: { current: { from: string; to: string }; previous: { from: string; to: string }; selected?: { from: string; to: string } };
  summary: {
    current: { orders: number; grossSales: number; netSales: number; aov: number };
    previous: { orders: number; grossSales: number; netSales: number; aov: number };
    revenueGrowth: number | null;
    ordersGrowth: number | null;
    aovGrowth: number | null;
  };
  aiSummary?: {
    status: "ai" | "rule-based";
    headline: string;
    summary: string[];
    advice: string[];
    sectionNotes: {
      sales: string;
      seo: string;
      products: string;
      channels: string;
      pending: string;
    };
    generatedAt: string;
  };
  diagnostics?: Array<{
    id: string;
    ownerArea: "Sales" | "SEO" | "Ads" | "Product" | "Ops";
    priority: "high" | "medium" | "low";
    score: number;
    problem: string;
    evidence: string;
    action: string;
    confidence: number;
  }>;
  decisionReport?: {
    verdict: string;
    confidence: number;
    sourceWindows: string[];
    operatingMode: Array<{
      lane: string;
      decision: string;
      evidence: string;
      action: string;
    }>;
    categoryDecisions: Array<{
      category: string;
      salesSignal: string;
      searchSignal: string;
      trendSignal: string;
      decision: string;
    }>;
    seoActions: Array<{
      query: string;
      page: string;
      evidence: string;
      action: string;
    }>;
    productActions: Array<{
      product: string;
      category: string;
      evidence: string;
      action: string;
      url: string | null;
    }>;
    channelGeoActions: Array<{
      area: string;
      evidence: string;
      action: string;
    }>;
    doNotDo: string[];
    dataNotes: string[];
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
  orderingPattern?: {
    timezone: string;
    peakDay: string | null;
    peakHour: string | null;
    bestCampaignWindows: string[];
    days: Array<{ day: string; orders: number; revenue: number; share: number; recommendation: string }>;
    hours: Array<{ hour: number; label: string; orders: number; revenue: number; share: number }>;
    channelTiming: Array<{ channel: string; peakDay: string; peakHour: string; orders: number; revenue: number; action: string }>;
  };
  pendingOrders: Array<{ name: string; createdAt: string; financialStatus: string; fulfillmentStatus: string; total: number; city: string | null }>;
  pendingTotal?: number;
  pendingWindow?: { from: string; to: string; label: string };
  searchConsole: {
    generatedAt: string;
    startDate: string;
    endDate: string;
    siteUrl: string;
    topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number; score: number }>;
    opportunities: Array<{ query: string; page: string; clicks: number; impressions: number; ctr: number; position: number; score: number; action: string; reason: string }>;
  } | null;
  searchConsoleError?: string | null;
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

function pctText(value: number) {
  return `${Math.round((value || 0) * 1000) / 10}%`;
}

function shortPage(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname || "/";
  } catch {
    return url;
  }
}

function clothingType(query: string) {
  const q = query.toLowerCase();
  if (/\b(tuxedo|suit|suits)\b/.test(q)) return "Suits";
  if (/\bshirt|shirts|overshirt\b/.test(q)) return "Shirts";
  if (/\btank\s*top|top|blouse\b/.test(q)) return "Tops";
  if (/\bpant|pants|trouser|trousers|chino|jeans|gabardine\b/.test(q)) return "Pants";
  if (/\bpolo\b/.test(q)) return "Polos";
  if (/\bdress|dresses\b/.test(q)) return "Dresses";
  if (/\bvest\b/.test(q)) return "Vests";
  return "Other";
}

function groupedDemandWins(rows: NonNullable<Report["searchConsole"]>["topQueries"]) {
  const groups = new Map<string, {
    label: string;
    clicks: number;
    impressions: number;
    weightedCtr: number;
    weightedPosition: number;
    queries: typeof rows;
  }>();

  for (const row of rows) {
    const label = clothingType(row.query);
    const current = groups.get(label) ?? {
      label,
      clicks: 0,
      impressions: 0,
      weightedCtr: 0,
      weightedPosition: 0,
      queries: [],
    };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.weightedCtr += row.ctr * row.impressions;
    current.weightedPosition += row.position * row.impressions;
    current.queries.push(row);
    groups.set(label, current);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      ctr: group.impressions ? group.weightedCtr / group.impressions : 0,
      position: group.impressions ? group.weightedPosition / group.impressions : 0,
      queries: group.queries.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions),
    }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
}

function Confidence({ value }: { value: number }) {
  const color = value >= 85 ? "text-green-400 bg-green-500/10" : value >= 70 ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10";
  return <span className={`text-xs font-bold px-2 py-1 rounded ${color}`}>{value}%</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-EG", { day: "numeric", month: "short" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-EG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hoursAgo(iso: string) {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 36_000) / 100);
  return `${hours.toFixed(hours < 10 ? 1 : 0)}h ago`;
}

function inputDate(daysBack = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

const growthMetricExplanations: Record<string, string> = {
  "Net sales": "Main money signal from Shopify orders in this report window.",
  Orders: "Demand volume. If orders fall, demand or conversion is the problem.",
  AOV: "Average order value. Shows whether customers are buying higher-ticket baskets.",
  "Pending/unfulfilled": "Orders from the last rolling 24 hours that still need recovery or follow-up.",
};

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
  return [...rows].filter((row) => row.units > 0).sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 5);
}

type ProductMovementRow = Report["products"][number] & { movementSignal?: string };

function slowByMovement(rows: Report["products"], topRows: Report["products"]): ProductMovementRow[] {
  const topKeys = new Set(topRows.map((row) => row.key));
  const avgUnits = rows.length ? rows.reduce((sum, row) => sum + row.units, 0) / rows.length : 0;
  const enoughDepthForAverageFlag = rows.length >= 8;

  return rows
    .filter((row) => !topKeys.has(row.key))
    .map((row) => {
      const signals = [];
      if (row.units === 0 && row.previousUnits > 0) signals.push(`No current sales; ${row.previousUnits} pieces previous period`);
      if (typeof row.unitChange === "number" && row.unitChange < 0) signals.push(`${row.unitChange}% vs previous period`);
      if (enoughDepthForAverageFlag && row.units > 0 && row.units < avgUnits * 0.6) signals.push(`Below 60% of category average ${avgUnits.toFixed(1)} pieces`);
      return { ...row, movementSignal: signals.join(" | ") };
    })
    .filter((row) => row.movementSignal)
    .sort((a, b) => {
      if (a.units === 0 && b.units !== 0) return -1;
      if (b.units === 0 && a.units !== 0) return 1;
      return a.units - b.units || (a.unitChange ?? 0) - (b.unitChange ?? 0) || a.revenue - b.revenue;
    })
    .slice(0, 5);
}

export default function GrowthAccelerationReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(inputDate(6));

  const load = async (nextFromDate = fromDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: nextFromDate, to: inputDate(0) });
      const res = await fetch(`/api/agency/growth?${params.toString()}`);
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
    load(fromDate);
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
          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
            <CalendarDays className="w-3.5 h-3.5 text-accent" />
            <label className="text-xs text-muted" htmlFor="growth-from">From</label>
            <input
              id="growth-from"
              type="date"
              value={fromDate}
              max={inputDate(0)}
              onChange={(event) => setFromDate(event.target.value)}
              className="bg-transparent text-xs text-foreground outline-none"
            />
            <span className="text-xs text-muted">to today</span>
          </div>
          <button
            onClick={() => load(fromDate)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-foreground-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Generating..." : "Generate report"}
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
                  Source: {report.source}. Newly generated report: {formatDate(report.window.current.from)} to {formatDate(report.window.current.to)}.
                  Old comparison report: {formatDate(report.window.previous.from)} to {formatDate(report.window.previous.to)}.
                  Generated at {formatDateTime(report.generatedAt)}.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">Net sales</p>
              <p className="text-xl font-bold text-accent">{money(report.summary.current.netSales)}</p>
              <p className={`text-xs mt-2 ${changeClass(report.summary.revenueGrowth)}`}>{change(report.summary.revenueGrowth)} vs previous</p>
              <p className="text-[11px] text-foreground-muted mt-2 leading-relaxed">{growthMetricExplanations["Net sales"]}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">Orders</p>
              <p className="text-xl font-bold text-foreground">{report.summary.current.orders.toLocaleString("en-EG")}</p>
              <p className={`text-xs mt-2 ${changeClass(report.summary.ordersGrowth)}`}>{change(report.summary.ordersGrowth)} vs previous</p>
              <p className="text-[11px] text-foreground-muted mt-2 leading-relaxed">{growthMetricExplanations.Orders}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">AOV</p>
              <p className="text-xl font-bold text-foreground">{money(report.summary.current.aov)}</p>
              <p className={`text-xs mt-2 ${changeClass(report.summary.aovGrowth)}`}>{change(report.summary.aovGrowth)} vs previous</p>
              <p className="text-[11px] text-foreground-muted mt-2 leading-relaxed">{growthMetricExplanations.AOV}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">Pending/unfulfilled</p>
              <p className="text-xl font-bold text-foreground">{(report.pendingTotal ?? report.pendingOrders.length).toLocaleString("en-EG")}</p>
              <p className="text-xs text-muted mt-2">
                {report.pendingWindow?.label || "Last 24 hours"} needing follow-up
                {report.pendingWindow ? ` (${formatDateTime(report.pendingWindow.from)} to ${formatDateTime(report.pendingWindow.to)})` : ""}
              </p>
              <p className="text-[11px] text-foreground-muted mt-2 leading-relaxed">{growthMetricExplanations["Pending/unfulfilled"]}</p>
            </div>
          </div>

          {report.aiSummary && <GrowthSummaryAdvice summary={report.aiSummary} diagnostics={report.diagnostics ?? []} />}
          {report.decisionReport && <DecisionReport report={report.decisionReport} />}
          {report.orderingPattern && <OrderingPatternReport pattern={report.orderingPattern} />}

          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-accent" /> Root causes and acceleration actions
            </h2>
            {report.aiSummary?.sectionNotes.sales && (
              <SectionNote text={report.aiSummary.sectionNotes.sales} />
            )}
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

          <SearchConsoleGrowth report={report} />

          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-1">
              <PackageCheck className="w-4 h-4 text-accent" /> Product movement by category
            </h2>
            <p className="text-xs text-muted mb-4">Ranked from live Shopify line-item quantities. Slow movers are products below their category average, down vs the previous 7 days, or sold before but not in the current period.</p>
            {report.aiSummary?.sectionNotes.products && (
              <SectionNote text={report.aiSummary.sectionNotes.products} />
            )}
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
                      {(() => {
                        const topRows = topByUnits(group.rows);
                        return (
                          <>
                            <ProductMovementTable title="Top 5 sellers by pieces" rows={topRows} />
                            <ProductMovementTable title="Top 5 slow movers by real movement signal" rows={slowByMovement(group.rows, topRows)} showSignal emptyText="No clear slow mover outside the top sellers for this category." />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-3">
              {report.aiSummary?.sectionNotes.channels && (
                <SectionNote text={report.aiSummary.sectionNotes.channels} />
              )}
            </div>
            <Breakdown title="Channels" icon={<Users className="w-4 h-4 text-accent" />} rows={report.channels} metric="orders" />
            <Breakdown title="Cities / regions" icon={<MapPin className="w-4 h-4 text-accent" />} rows={report.cities} metric="orders" />
            <Breakdown title="Categories" icon={<BarChart3 className="w-4 h-4 text-accent" />} rows={report.categories} metric="units" />
          </div>

          {report.pendingOrders.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <Truck className="w-4 h-4 text-accent" /> Pending/unfulfilled orders to recover - last rolling 24 hours
              </h2>
              {report.aiSummary?.sectionNotes.pending && (
                <SectionNote text={report.aiSummary.sectionNotes.pending} compact />
              )}
              {report.pendingWindow && (
                <p className="text-xs text-muted mb-3">
                  Window: {formatDateTime(report.pendingWindow.from)} to {formatDateTime(report.pendingWindow.to)}.
                  Showing {report.pendingOrders.length} of {(report.pendingTotal ?? report.pendingOrders.length).toLocaleString("en-EG")} matching orders.
                </p>
              )}
              <div className="grid gap-2">
                {report.pendingOrders.map((order) => (
                  <div key={order.name} className="grid grid-cols-5 gap-3 bg-surface-2 border border-border rounded-lg p-3 text-xs">
                    <span className="font-bold text-foreground">{order.name}</span>
                    <span className="text-muted">{formatDateTime(order.createdAt)} · {hoursAgo(order.createdAt)}</span>
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

function DecisionReport({ report }: { report: NonNullable<Report["decisionReport"]> }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" /> Decision report
          </h2>
          <p className="text-xs text-muted mt-1">Rule-built from live Shopify, Search Console, and cached trend context. Use this for action planning.</p>
        </div>
        <Confidence value={report.confidence} />
      </div>

      <div className="bg-surface-2 border border-border rounded-xl p-4 mb-5">
        <p className="text-sm font-bold text-foreground leading-relaxed">{report.verdict}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {report.sourceWindows.map((source) => (
            <span key={source} className="text-[10px] text-foreground-muted bg-surface border border-border px-2 py-1 rounded-full">
              {source}
            </span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        {report.operatingMode.map((item) => (
          <div key={item.lane} className="bg-surface-2 border border-border rounded-lg p-4">
            <p className="text-xs text-accent font-bold uppercase tracking-wide">{item.lane}</p>
            <p className="text-sm font-bold text-foreground mt-2">{item.decision}</p>
            <p className="text-xs text-muted mt-2 leading-relaxed">{item.evidence}</p>
            <p className="text-xs text-green-300 mt-2 leading-relaxed">Action: {item.action}</p>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <p className="text-xs font-bold text-foreground mb-2">Category decisions</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-border">
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Shopify sales</th>
                <th className="py-2 pr-3">Search Console</th>
                <th className="py-2 pr-3">Trend context</th>
                <th className="py-2 pr-3">Decision</th>
              </tr>
            </thead>
            <tbody>
              {report.categoryDecisions.map((row) => (
                <tr key={row.category} className="border-b border-border/60 align-top">
                  <td className="py-3 pr-3 text-foreground font-bold">{row.category}</td>
                  <td className="py-3 pr-3 text-foreground-muted text-xs">{row.salesSignal}</td>
                  <td className="py-3 pr-3 text-foreground-muted text-xs">{row.searchSignal}</td>
                  <td className="py-3 pr-3 text-foreground-muted text-xs">{row.trendSignal}</td>
                  <td className="py-3 pr-3 text-green-300 text-xs font-medium">{row.decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-4 mb-5">
        <DecisionList
          title="SEO actions"
          rows={report.seoActions.map((row) => ({
            title: row.query,
            evidence: `${shortPage(row.page)} - ${row.evidence}`,
            action: row.action,
            href: row.page,
          }))}
        />
        <DecisionList
          title="Product actions"
          rows={report.productActions.slice(0, 6).map((row) => ({
            title: row.product,
            evidence: `${row.category} - ${row.evidence}`,
            action: row.action,
            href: row.url || undefined,
          }))}
        />
        <DecisionList
          title="Channel and geo"
          rows={report.channelGeoActions.slice(0, 8).map((row) => ({
            title: row.area,
            evidence: row.evidence,
            action: row.action,
          }))}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-xs font-bold text-red-300 uppercase tracking-wide mb-2">Do not do</p>
          <div className="space-y-2">
            {report.doNotDo.map((item) => (
              <p key={item} className="text-xs text-foreground-muted leading-relaxed">{item}</p>
            ))}
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-2">Data notes</p>
          <div className="space-y-2">
            {report.dataNotes.map((item) => (
              <p key={item} className="text-xs text-foreground-muted leading-relaxed">{item}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderingPatternReport({ pattern }: { pattern: NonNullable<Report["orderingPattern"]> }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" /> Ordering time and campaign focus
          </h2>
          <p className="text-xs text-muted mt-1">Order timestamps converted to {pattern.timezone}. Use this to choose campaign days, monitoring hours, and recovery staffing.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted">Peak</p>
          <p className="text-xs font-bold text-accent">{pattern.peakDay || "No day"} {pattern.peakHour ? `- ${pattern.peakHour}` : ""}</p>
        </div>
      </div>

      {pattern.bestCampaignWindows.length > 0 && (
        <div className="bg-accent/5 border border-accent/15 rounded-lg p-4 mb-5">
          <p className="text-xs font-bold text-accent mb-2">Best campaign windows</p>
          <div className="flex flex-wrap gap-2">
            {pattern.bestCampaignWindows.map((window) => (
              <span key={window} className="text-xs text-foreground bg-surface border border-border px-3 py-1.5 rounded-full">
                {window}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-3 gap-4">
        <div className="bg-surface-2 border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-foreground mb-3">Days to focus campaigns</p>
          <div className="space-y-2">
            {pattern.days.map((row) => (
              <div key={row.day} className="border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-foreground">{row.day}</p>
                  <p className="text-xs text-accent">{row.share}% orders</p>
                </div>
                <p className="text-xs text-muted mt-1">{row.orders} orders - {money(row.revenue)}</p>
                <p className="text-[11px] text-foreground-muted mt-1 leading-relaxed">{row.recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-2 border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-foreground mb-3">Peak order hours</p>
          <div className="space-y-2">
            {pattern.hours.map((row) => (
              <div key={row.label} className="grid grid-cols-[76px_1fr_auto] items-center gap-3 text-xs">
                <span className="font-bold text-foreground">{row.label}</span>
                <div className="h-2 bg-surface border border-border rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${Math.min(100, row.share * 3)}%` }} />
                </div>
                <span className="text-muted">{row.orders} orders</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-2 border border-border rounded-lg p-4">
          <p className="text-xs font-bold text-foreground mb-3">Sales channels by timing</p>
          <div className="space-y-3">
            {pattern.channelTiming.map((row) => (
              <div key={row.channel} className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">{row.channel}</p>
                  <span className="text-[10px] text-accent">{row.peakDay} {row.peakHour}</span>
                </div>
                <p className="text-[11px] text-muted mt-1">{row.orders} orders - {money(row.revenue)}</p>
                <p className="text-[11px] text-green-300 mt-1 leading-relaxed">Action: {row.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DecisionList({ title, rows }: { title: string; rows: Array<{ title: string; evidence: string; action: string; href?: string }> }) {
  return (
    <div className="bg-surface-2 border border-border rounded-lg p-4 min-w-0">
      <p className="text-xs font-bold text-foreground mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted">No rows available.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={`${title}-${row.title}-${row.evidence}`} className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold text-foreground leading-snug">{row.title}</p>
                {row.href && (
                  <a href={row.href} target="_blank" rel="noreferrer" className="text-accent hover:underline flex-shrink-0">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-[11px] text-muted mt-1 leading-relaxed">{row.evidence}</p>
              <p className="text-[11px] text-green-300 mt-1 leading-relaxed">Action: {row.action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchConsoleGrowth({ report }: { report: Report }) {
  const gsc = report.searchConsole;
  const demandGroups = gsc ? groupedDemandWins(gsc.topQueries) : [];

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Search className="w-4 h-4 text-accent" /> Google Search growth
          </h2>
          <p className="text-xs text-muted mt-1">
            Search Console data for pages and queries. Shows actions only, not the full raw export.
          </p>
        </div>
        {gsc && (
          <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-1 rounded">
            {formatDate(gsc.startDate)} to {formatDate(gsc.endDate)}
          </span>
        )}
      </div>

      {!gsc && (
        <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-lg p-4">
          <p className="text-sm font-bold text-yellow-400">Search Console not available</p>
          <p className="text-xs text-foreground-muted mt-1">{report.searchConsoleError || "No Search Console data returned."}</p>
        </div>
      )}

      {gsc && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold text-foreground mb-2">Search demand wins</p>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              {demandGroups.slice(0, 8).map((group) => (
                <div key={group.label} className="bg-surface-2 border border-border rounded-lg p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{group.label}</p>
                    <span className="text-[10px] text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded">
                      {group.queries.length} queries
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {group.clicks} clicks - {group.impressions} impressions - CTR {pctText(group.ctr)} - avg pos {group.position.toFixed(1)}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {group.queries.slice(0, 4).map((row) => (
                      <span key={row.query} className="text-[10px] text-foreground-muted bg-surface border border-border px-2 py-1 rounded-full">
                        {row.query}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-foreground mb-2">Pages to update</p>
            {report.aiSummary?.sectionNotes.seo && <SectionNote text={report.aiSummary.sectionNotes.seo} compact />}
            {gsc.opportunities.length === 0 ? (
              <div className="border border-border rounded-lg p-4 text-xs text-muted">No page-level SEO opportunities returned.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted border-b border-border">
                      <th className="py-2 pr-3">Query</th>
                      <th className="py-2 pr-3">Page</th>
                      <th className="py-2 pr-3">CTR / pos</th>
                      <th className="py-2 pr-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gsc.opportunities.slice(0, 8).map((row) => (
                      <tr key={`${row.query}-${row.page}`} className="border-b border-border/60">
                        <td className="py-3 pr-3">
                          <p className="text-foreground font-medium">{row.query}</p>
                          <p className="text-xs text-muted">{row.clicks} clicks - {row.impressions} impressions</p>
                        </td>
                        <td className="py-3 pr-3">
                          <a href={row.page} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-1 max-w-[220px]">
                            <span className="truncate">{shortPage(row.page)}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </td>
                        <td className="py-3 pr-3 text-foreground-muted">
                          {pctText(row.ctr)} / {row.position.toFixed(1)}
                        </td>
                        <td className="py-3 pr-3">
                          <p className="text-xs font-bold text-green-400">{row.action}</p>
                          <p className="text-[11px] text-muted mt-1 max-w-[240px]">{row.reason}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function priorityClass(priority: "high" | "medium" | "low") {
  if (priority === "high") return "bg-red-500/10 text-red-300 border-red-500/25";
  if (priority === "medium") return "bg-yellow-500/10 text-yellow-300 border-yellow-500/25";
  return "bg-blue-500/10 text-blue-300 border-blue-500/25";
}

function GrowthSummaryAdvice({ summary, diagnostics }: { summary: NonNullable<Report["aiSummary"]>; diagnostics: NonNullable<Report["diagnostics"]> }) {
  return (
    <div className="bg-surface border border-accent/25 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-accent" /> Summary and advice
          </h2>
          <p className="text-xs text-muted mt-1">
            {summary.status === "ai"
              ? "AI summary from live Shopify, Search Console, and cached trend-scan facts."
              : "Rule-based summary from live Shopify, Search Console, and cached trend-scan facts."}
          </p>
        </div>
        <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-2 py-1 rounded uppercase">
          {summary.status}
        </span>
      </div>

      <p className="text-sm font-bold text-foreground mb-4">{summary.headline}</p>
      {diagnostics.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Executive diagnosis</p>
            <p className="text-[10px] text-muted">Rule-based, ranked by impact</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-3">
            {diagnostics.slice(0, 3).map((item) => (
              <div key={item.id} className="bg-surface border border-border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] border px-1.5 py-0.5 rounded uppercase ${priorityClass(item.priority)}`}>
                    {item.priority}
                  </span>
                  <span className="text-[10px] text-muted">{item.ownerArea} - {item.score}/100</span>
                </div>
                <p className="text-xs font-bold text-foreground leading-snug">{item.problem}</p>
                <p className="text-[11px] text-muted mt-2 leading-relaxed">{item.evidence}</p>
                <p className="text-[11px] text-green-300 mt-2 leading-relaxed">Action: {item.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">What is happening</p>
          <div className="space-y-2">
            {summary.summary.map((item, i) => (
              <p key={`${item}-${i}`} className="text-sm text-foreground-muted leading-relaxed">{i + 1}. {item}</p>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">What to do next</p>
          <div className="space-y-2">
            {summary.advice.map((item, i) => (
              <p key={`${item}-${i}`} className="text-sm text-green-300 leading-relaxed">{i + 1}. {item}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionNote({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`bg-accent/5 border border-accent/15 rounded-lg ${compact ? "p-3 mb-3" : "p-4 mb-4"}`}>
      <p className="text-xs text-foreground-muted leading-relaxed">
        <span className="font-bold text-accent">Summary: </span>{text}
      </p>
    </div>
  );
}

function ProductMovementTable({ title, rows, showSignal = false, emptyText = "No products found." }: { title: string; rows: ProductMovementRow[]; showSignal?: boolean; emptyText?: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-foreground mb-2">{title}</p>
      {rows.length === 0 ? (
        <div className="border border-border rounded-lg p-4 text-xs text-muted">{emptyText}</div>
      ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted border-b border-border">
            <th className="py-2 pr-3">Product family</th>
            <th className="py-2 pr-3">Units</th>
            <th className="py-2 pr-3">Revenue</th>
            <th className="py-2 pr-3">Unit change</th>
            {showSignal && <th className="py-2 pr-3">Why flagged</th>}
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
              {showSignal && <td className="py-3 pr-3 text-muted text-xs">{p.movementSignal}</td>}
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
      )}
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
