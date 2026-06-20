"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  PackageCheck,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { HelpButton } from "@/components/ui/help-button";

const drivers = [
  {
    title: "AOV surge is the main growth engine",
    metric: "+25.3%",
    detail: "Average order value moved from EGP 1,507 to EGP 1,889. Orders are lower, but every order is worth more.",
    confidence: 90,
  },
  {
    title: "Premium polo styles are leading demand",
    metric: "EGP 4K-5.2K",
    detail: "Open-Stitch Knitted Teal-Blue V-Neck Polo, Black Knitted Jacquard Polo, and Pique White V-Neck Polo are driving high-ticket T-shirt revenue.",
    confidence: 88,
  },
  {
    title: "Cartsaver CoD became a new revenue stream",
    metric: "20.8%",
    detail: "Cartsaver OTP CoD contributed about EGP 18,525 across 9 orders, with around EGP 2,058 AOV.",
    confidence: 82,
  },
  {
    title: "New customers are carrying the week",
    metric: "59%",
    detail: "New customers are responsible for most of this week's T-shirt revenue, so the next step is retention and second purchase capture.",
    confidence: 80,
  },
];

const actions = [
  {
    priority: "P1",
    title: "Run a 48-hour premium polo push",
    owner: "Marketing",
    action: "Hero Teal-Blue V-Neck Polo, support with Black Jacquard Polo and White Pique Polo.",
    outcome: "Keep AOV above EGP 1,850 while recovering order volume.",
  },
  {
    priority: "P1",
    title: "Launch Buy 2 Premium Polos offer",
    owner: "Ecommerce",
    action: "Use 10% saving or free accessory threshold instead of deep discounting.",
    outcome: "Lift basket value without training customers to wait for heavy markdowns.",
  },
  {
    priority: "P1",
    title: "Audit Cartsaver CoD flows",
    owner: "CRM",
    action: "Check OTP copy, WhatsApp reminder timing, CoD instructions, and urgency nudges.",
    outcome: "Protect the new 20.8% channel contribution and reduce failed CoD orders.",
  },
  {
    priority: "P2",
    title: "Check top 4 polo stock before weekend",
    owner: "Merchandising",
    action: "Confirm size depth for the top premium polo SKUs and pause ads if stock gets thin.",
    outcome: "Avoid stockout killing the highest-AOV momentum.",
  },
  {
    priority: "P2",
    title: "Create new-customer follow-up segment",
    owner: "CRM",
    action: "Send care, styling, and second-item recommendations 2-3 days after first order.",
    outcome: "Convert acquisition growth into repeat purchase growth.",
  },
];

const campaignAssets = [
  {
    label: "Arabic hook",
    text: "البولو اللي يطلعك من خروجة الصبح لعزومة بليل",
  },
  {
    label: "English hook",
    text: "Premium summer polos that do not look basic.",
  },
  {
    label: "Offer",
    text: "Buy 2 Premium Polos - Save 10%",
  },
  {
    label: "Audience",
    text: "Men 22-38 in Cairo, Giza, Alexandria. Smart casual, summer outings, North Coast prep.",
  },
];

const automationBacklog = [
  "Detect whether growth comes from order volume, AOV, product mix, or channel shift.",
  "Group product families so one color family does not dominate the report.",
  "Add Cartsaver CoD channel breakout to weekly agency reports.",
  "Add stock-risk warning for products driving weekly growth.",
  "Add new-customer vs returning-customer action cards.",
];

function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 85 ? "text-green-400 bg-green-500/10" : value >= 75 ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10";
  return <span className={`text-xs font-bold px-2 py-1 rounded ${color}`}>{value}% confidence</span>;
}

export default function GrowthAccelerationReportPage() {
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
              <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">SHOPIFY SIGNAL</span>
              <HelpButton section="/agency/weekly" />
            </div>
            <p className="text-sm text-muted">T-shirt growth diagnosis and 48-hour execution plan for DE BACKERS.</p>
          </div>
        </div>
        <Link href="/agency" className="text-xs text-accent hover:underline flex items-center gap-1">
          Back to reports <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground mb-1">Source note</p>
            <p className="text-sm text-foreground-muted leading-relaxed">
              This report is based on the Shopify growth summary you provided. The live Shopify connector is still blocked by OAuth reauthentication, so this page avoids API spend and does not modify store data.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-muted mb-2">Primary driver</p>
          <p className="text-xl font-bold text-accent">AOV mix</p>
          <p className="text-xs text-muted mt-2">Growth comes from higher order value, not higher order count.</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-muted mb-2">Winning category</p>
          <p className="text-xl font-bold text-foreground">Premium polos</p>
          <p className="text-xs text-muted mt-2">Knitted, pique, and V-neck styles are pulling spend up.</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-muted mb-2">New channel</p>
          <p className="text-xl font-bold text-foreground">Cartsaver CoD</p>
          <p className="text-xs text-muted mt-2">Already meaningful enough to audit and scale carefully.</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-muted mb-2">Risk</p>
          <p className="text-xl font-bold text-red-400">Stockout</p>
          <p className="text-xs text-muted mt-2">Top polo SKUs can cap the weekend upside if size depth is thin.</p>
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
                  <p className="text-2xl font-bold text-accent mt-1">{driver.metric}</p>
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
          <Target className="w-4 h-4 text-accent" /> 48-hour acceleration plan
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
            {campaignAssets.map((asset) => (
              <div key={asset.label} className="bg-surface-2 border border-border rounded-xl p-3">
                <p className="text-[10px] text-muted mb-1 uppercase">{asset.label}</p>
                <p className="text-sm text-foreground" dir={asset.label === "Arabic hook" ? "rtl" : "ltr"}>{asset.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
            <PackageCheck className="w-4 h-4 text-accent" /> What the app should automate next
          </h2>
          <div className="space-y-3">
            {automationBacklog.map((item) => (
              <div key={item} className="flex items-start gap-3 bg-surface-2 border border-border rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-5 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-yellow-400 mb-1">Decision rule</p>
          <p className="text-sm text-foreground-muted leading-relaxed">
            Do not treat this as a discounting signal. The growth is coming from premium mix. Push premium polos, protect AOV, and use bundles only to increase quantity per order.
          </p>
        </div>
      </div>
    </div>
  );
}
