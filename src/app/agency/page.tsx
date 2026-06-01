"use client";

import Link from "next/link";
import { Briefcase, FlameKindling, CalendarRange, LineChart, ArrowRight, Info } from "lucide-react";

const reports = [
  {
    href: "/agency/flash",
    icon: FlameKindling,
    title: "Flash Brief",
    subtitle: "Every 3 days",
    description: "Top trends right now, 3 campaign ideas, hooks ready to use. For marketing team + content creators.",
    badge: "3-DAY",
    badgeColor: "bg-orange-500/20 text-orange-400",
    iconColor: "text-orange-400",
    audience: ["Marketing Team", "Content Creators"],
  },
  {
    href: "/agency/weekly",
    icon: CalendarRange,
    title: "Weekly Report",
    subtitle: "Every Monday",
    description: "Full week strategy, competitor watch, day-by-day content plan, KPI targets.",
    badge: "WEEKLY",
    badgeColor: "bg-blue-500/20 text-blue-400",
    iconColor: "text-blue-400",
    audience: ["Management", "Marketing Team"],
  },
  {
    href: "/agency/monthly",
    icon: LineChart,
    title: "Monthly Strategy",
    subtitle: "1st of every month",
    description: "Full market analysis, seasonal plan, campaign calendar, budget recommendations, KPI forecast.",
    badge: "MONTHLY",
    badgeColor: "bg-purple-500/20 text-purple-400",
    iconColor: "text-purple-400",
    audience: ["Management"],
  },
];

export default function AgencyHubPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agency Intelligence</h1>
            <p className="text-sm text-muted">DeBacker&apos;s AI Marketing Research — replacing agency research with real data</p>
          </div>
        </div>
      </div>

      {/* Data transparency notice */}
      <div className="bg-surface-2 border border-border rounded-xl p-4 mb-8 flex gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">Data Transparency</p>
          <div className="flex flex-wrap gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> <strong className="text-foreground">LIVE</strong> — Real data from Shopify API</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> <strong className="text-foreground">AI RESEARCH</strong> — AI-analyzed market intelligence (Groq Llama 3.3)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> <strong className="text-foreground">MOCK</strong> — Placeholder data, not yet connected</span>
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid gap-4">
        {reports.map(({ href, icon: Icon, title, subtitle, description, badge, badgeColor, iconColor, audience }) => (
          <Link
            key={href}
            href={href}
            className="bg-surface border border-border rounded-xl p-6 hover:border-accent/40 hover:bg-surface-2 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold text-foreground">{title}</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeColor}`}>{badge}</span>
                  </div>
                  <p className="text-xs text-muted mb-2">{subtitle}</p>
                  <p className="text-sm text-foreground-muted">{description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-muted">For:</span>
                    {audience.map((a) => (
                      <span key={a} className="text-xs bg-surface-2 text-foreground-muted px-2 py-0.5 rounded-full border border-border">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted group-hover:text-accent transition-colors flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {/* Meta Ads coming soon */}
      <div className="mt-6 bg-surface border border-dashed border-border rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
            <span className="text-sm">📱</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Meta Ads Integration — Coming Soon</p>
            <p className="text-xs text-muted">Once connected, this section will show real campaign performance, ROAS, spend efficiency, and audience data from your Meta Ads account.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
