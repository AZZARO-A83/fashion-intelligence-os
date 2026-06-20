"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { HelpButton } from "@/components/ui/help-button";
import { TopProduct } from "@/types";

type SalesResponse = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  weeklyGrowth: number;
  ordersGrowth?: number;
  aovGrowth?: number;
  repeatPurchaseRate: number;
  abandonedCarts: number;
  recoveryOpportunity?: number;
  topProducts: TopProduct[];
  topByUnits?: TopProduct[];
  lowProducts: TopProduct[];
  rangeFrom: string;
  rangeTo: string;
  isLive: boolean;
  dataError?: string;
  dataSource?: string;
  dataNote?: string;
};

function fmtMoney(value: number) {
  return `EGP ${Math.round(value || 0).toLocaleString("en-EG")}`;
}

function pct(value?: number) {
  const v = Number(value || 0);
  return `${v > 0 ? "+" : ""}${v}%`;
}

function egyptYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function lastDaysRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days + 1);
  return { from: egyptYmd(from), to: egyptYmd(to) };
}

function confidenceFor(data: SalesResponse) {
  if (!data.isLive) return 25;
  if (data.totalOrders >= 50) return 90;
  if (data.totalOrders >= 20) return 82;
  if (data.totalOrders >= 8) return 70;
  return 55;
}

function productLine(product?: TopProduct) {
  if (!product) return "No product data available yet.";
  return `${product.name} - ${product.units} units, ${fmtMoney(product.revenue)} revenue`;
}

function buildDrivers(data: SalesResponse) {
  const topRevenue = data.topProducts?.[0];
  const topUnits = data.topByUnits?.[0];
  const confidence = confidenceFor(data);

  return [
    {
      title: "AOV movement",
      metric: pct(data.aovGrowth),
      detail:
        (data.aovGrowth || 0) >= 0
          ? `Average order value is ${fmtMoney(data.avgOrderValue)}. Growth is being supported by basket value and product mix.`
          : `Average order value is ${fmtMoney(data.avgOrderValue)}. AOV is under pressure, so avoid discounts that reduce basket value.`,
      confidence,
      positive: (data.aovGrowth || 0) >= 0,
    },
    {
      title: "Order volume movement",
      metric: pct(data.ordersGrowth),
      detail:
        (data.ordersGrowth || 0) >= 0
          ? `${data.totalOrders.toLocaleString("en-EG")} orders in the selected live window. Volume is supporting growth.`
          : `${data.totalOrders.toLocaleString("en-EG")} orders in the selected live window. Revenue needs support from conversion and retargeting.`,
      confidence,
      positive: (data.ordersGrowth || 0) >= 0,
    },
    {
      title: "Revenue leader",
      metric: topRevenue ? fmtMoney(topRevenue.revenue) : "N/A",
      detail: productLine(topRevenue),
      confidence: topRevenue ? confidence : 40,
      positive: !!topRevenue,
    },
    {
      title: "Unit leader",
      metric: topUnits ? `${topUnits.units} units` : "N/A",
      detail: productLine(topUnits),
      confidence: topUnits ? confidence : 40,
      positive: !!topUnits,
    },
  ];
}

function buildActions(data: SalesResponse) {
  const topRevenue = data.topProducts?.[0];
  const topUnits = data.topByUnits?.[0];
  const low = data.lowProducts?.[0];
  const aovUp = (data.aovGrowth || 0) >= 0;
  const ordersDown = (data.ordersGrowth || 0) < 0;

  return [
    {
      priority: "P1",
      title: topRevenue ? `Push ${topRevenue.name}` : "Pick hero product after sales data loads",
      owner: "Marketing",
      action: topRevenue
        ? `Use the revenue leader as the hero product in homepage, Meta retargeting, and reels. It produced ${fmtMoney(topRevenue.revenue)} from ${topRevenue.units} units.`
        : "No live product winner available.",
      outcome: "Focus paid and organic attention on the proven money product.",
    },
    {
      priority: "P1",
      title: aovUp ? "Protect AOV with bundles, not heavy discounts" : "Recover AOV before scaling spend",
      owner: "Ecommerce",
      action: aovUp
        ? "Use 2-item bundles, free accessory threshold, or styling sets. Do not discount the winner too hard."
        : "Audit discounting, low-price products, and cart composition before increasing ad spend.",
      outcome: aovUp ? "Increase units per order while protecting margin." : "Stop revenue growth from being diluted by weak baskets.",
    },
    {
      priority: ordersDown ? "P1" : "P2",
      title: ordersDown ? "Recover order volume with retargeting" : "Scale winning traffic carefully",
      owner: "Performance",
      action: ordersDown
        ? "Run 48-hour retargeting for product viewers, add-to-cart users, and Cartsaver/WhatsApp follow-up."
        : "Increase budget only on ads using the live winning product and proven offer.",
      outcome: ordersDown ? "Close the gap between high AOV and weak order count." : "Scale without diluting conversion quality.",
    },
    {
      priority: "P2",
      title: topUnits ? `Check stock depth for ${topUnits.name}` : "Check stock for unit leader",
      owner: "Merchandising",
      action: topUnits
        ? `This product has the highest unit velocity at ${topUnits.units} units. Confirm size/color availability before pushing more traffic.`
        : "Inventory detail is not available in this report yet.",
      outcome: "Avoid stockout on the product most likely to move quantity.",
    },
    {
      priority: "P2",
      title: low ? `Fix or de-prioritize ${low.name}` : "Review low movement products",
      owner: "Merchandising",
      action: low
        ? `${low.name} moved ${low.units} units. Test bundle placement, new styling angle, or remove from premium traffic paths.`
        : "No low movement product data available.",
      outcome: "Stop weak products from absorbing attention that should go to winners.",
    },
  ];
}

function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 85 ? "text-green-400 bg-green-500/10" : value >= 70 ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10";
  return <span className={`text-xs font-bold px-2 py-1 rounded ${color}`}>{value}% confidence</span>;
}

export default function GrowthAccelerationReportPage() {
  const defaultRange = useMemo(() => lastDaysRange(7), []);
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales?from=${defaultRange.from}&to=${defaultRange.to}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.details || payload.error || `HTTP ${res.status}`);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load live Shopify sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drivers = data ? buildDrivers(data) : [];
  const actions = data ? buildActions(data) : [];
  const reportConfidence = data ? confidenceFor(data) : 0;
  const topRevenue = data?.topProducts?.[0];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Growth Acceleration Report</h1>
              <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">LIVE SHOPIFY</span>
              <HelpButton section="/agency/weekly" />
            </div>
            <p className="text-sm text-muted">Authenticated Shopify sales diagnosis for the last 7 days.</p>
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
          <p className="text-sm text-foreground">Loading authenticated Shopify sales data...</p>
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

      {data && !loading && (
        <>
          <div className={`border rounded-xl p-5 ${data.isLive ? "bg-green-500/10 border-green-500/25" : "bg-red-500/10 border-red-500/25"}`}>
            <div className="flex items-start gap-3">
              {data.isLive ? <ShieldCheck className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm font-bold mb-1 ${data.isLive ? "text-green-400" : "text-red-400"}`}>
                  {data.isLive ? "Authenticated live Shopify data" : "Not live - do not use for decisions"}
                </p>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  {data.isLive
                    ? `Source: app Shopify Admin API credentials. Window: ${new Date(data.rangeFrom).toLocaleDateString("en-EG")} to ${new Date(data.rangeTo).toLocaleDateString("en-EG")}.`
                    : data.dataError || data.dataNote || "Shopify credentials are not available."}
                </p>
              </div>
              <div className="ml-auto">
                <ConfidenceBadge value={reportConfidence} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">Net sales</p>
              <p className="text-xl font-bold text-accent">{fmtMoney(data.totalRevenue)}</p>
              <p className="text-xs text-muted mt-2">{pct(data.weeklyGrowth)} vs previous equal period</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">Orders</p>
              <p className="text-xl font-bold text-foreground">{data.totalOrders.toLocaleString("en-EG")}</p>
              <p className="text-xs text-muted mt-2">{pct(data.ordersGrowth)} vs previous equal period</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">Average order value</p>
              <p className="text-xl font-bold text-foreground">{fmtMoney(data.avgOrderValue)}</p>
              <p className="text-xs text-muted mt-2">{pct(data.aovGrowth)} vs previous equal period</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs text-muted mb-2">Recovery opportunity</p>
              <p className="text-xl font-bold text-foreground">{fmtMoney(data.recoveryOpportunity || 0)}</p>
              <p className="text-xs text-muted mt-2">{data.abandonedCarts.toLocaleString("en-EG")} abandoned carts</p>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-accent" /> What is driving growth
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {drivers.map((driver) => (
                <div key={driver.title} className="bg-surface-2 border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">{driver.title}</p>
                      <p className={`text-2xl font-bold mt-1 ${driver.positive ? "text-accent" : "text-red-400"}`}>{driver.metric}</p>
                    </div>
                    <ConfidenceBadge value={driver.confidence} />
                  </div>
                  <p className="text-sm text-foreground-muted leading-relaxed">{driver.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-accent" /> Action plan from live data
            </h2>
            <div className="space-y-3">
              {actions.map((item) => (
                <div key={item.title} className="grid grid-cols-[60px_1fr_120px_1.2fr] gap-4 items-start bg-surface-2 border border-border rounded-xl p-4">
                  <span className="text-xs font-bold text-accent bg-accent/10 rounded px-2 py-1 w-fit">{item.priority}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted mt-1">{item.action}</p>
                  </div>
                  <p className="text-xs text-foreground-muted">{item.owner}</p>
                  <p className="text-xs text-green-400">{item.outcome}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-accent" /> Campaign angle
              </h2>
              <div className="space-y-3">
                <div className="bg-surface-2 border border-border rounded-xl p-3">
                  <p className="text-[10px] text-muted mb-1 uppercase">Arabic hook</p>
                  <p className="text-sm text-foreground" dir="rtl">
                    {topRevenue ? `${topRevenue.name} للوك صيفي شيك من غير ما تبقى basic` : "اختاروا المنتج الفائز بعد تحميل بيانات Shopify"}
                  </p>
                </div>
                <div className="bg-surface-2 border border-border rounded-xl p-3">
                  <p className="text-[10px] text-muted mb-1 uppercase">English hook</p>
                  <p className="text-sm text-foreground">{topRevenue ? `${topRevenue.name}: the live bestseller to build this week's push around.` : "Live bestseller is not available yet."}</p>
                </div>
                <div className="bg-surface-2 border border-border rounded-xl p-3">
                  <p className="text-[10px] text-muted mb-1 uppercase">Offer logic</p>
                  <p className="text-sm text-foreground">{(data.aovGrowth || 0) >= 0 ? "Bundle to increase units per order. Avoid heavy markdowns while AOV is healthy." : "Use controlled offer to rebuild AOV before scaling traffic."}</p>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <PackageCheck className="w-4 h-4 text-accent" /> Data limits still missing
              </h2>
              <div className="space-y-3">
                {[
                  "Channel breakout such as Cartsaver CoD is not yet exposed by the current /api/sales route.",
                  "New vs returning customer revenue mix needs order/customer enrichment.",
                  "Inventory stock-risk needs live product variant inventory joined to top sellers.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 bg-surface-2 border border-border rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground-muted">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-5 flex gap-3">
            {(data.aovGrowth || 0) >= 0 ? <TrendingUp className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" /> : <TrendingDown className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />}
            <div>
              <p className="text-sm font-bold text-yellow-400 mb-1">Decision rule</p>
              <p className="text-sm text-foreground-muted leading-relaxed">
                Every recommendation above is derived from the live `/api/sales` Shopify response. If the live flag is red, the report should not be used for decisions.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
