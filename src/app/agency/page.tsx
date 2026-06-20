"use client";

import Link from "next/link";
import { Briefcase, FlameKindling, CalendarRange, LineChart, ArrowRight, Info, TrendingUp } from "lucide-react";
import { HelpButton } from "@/components/ui/help-button";

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
    href: "/agency/growth",
    icon: TrendingUp,
    title: "Growth Acceleration",
    subtitle: "Shopify signal report",
    description: "AOV drivers, premium product winners, Cartsaver CoD impact, stock risk, and a 48-hour action plan.",
    badge: "GROWTH",
    badgeColor: "bg-green-500/20 text-green-400",
    iconColor: "text-green-400",
    audience: ["Management", "Marketing Team", "Merchandising"],
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
  {
    href: "/monthly-plan",
    icon: CalendarRange,
    title: "Monthly Plan",
    subtitle: "Execution calendar",
    description: "Practical monthly actions, campaign timing, product focus, and team execution plan.",
    badge: "PLAN",
    badgeColor: "bg-cyan-500/20 text-cyan-400",
    iconColor: "text-cyan-400",
    audience: ["Management", "Marketing Team"],
  },
  {
    href: "/calendar",
    icon: CalendarRange,
    title: "Event Calendar",
    subtitle: "Seasonal timing",
    description: "Egypt seasonality, campaign moments, salary-week timing, and upcoming retail events.",
    badge: "CALENDAR",
    badgeColor: "bg-yellow-500/20 text-yellow-400",
    iconColor: "text-yellow-400",
    audience: ["Marketing Team", "Content Creators"],
  },
];

const reportGroups = [
  {
    title: "Operate this week",
    description: "Use these when the team needs current decisions: what is moving, what is slowing, what to push next.",
    items: reports.filter((report) => ["/agency/flash", "/agency/weekly", "/agency/growth"].includes(report.href)),
  },
  {
    title: "Plan next month",
    description: "Use these when management needs budget direction, seasonal planning, and campaign calendar decisions.",
    items: reports.filter((report) => ["/agency/monthly", "/monthly-plan", "/calendar"].includes(report.href)),
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Agency Intelligence</h1>
              <HelpButton section="/agency" />
            </div>
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
      <div className="space-y-6">
        {reportGroups.map((group) => (
          <section key={group.title} className="bg-surface border border-border rounded-xl p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-foreground">{group.title}</h2>
              <p className="text-xs text-muted mt-1">{group.description}</p>
            </div>
            <div className="grid gap-4">
              {group.items.map(({ href, icon: Icon, title, subtitle, description, badge, badgeColor, iconColor, audience }) => (
                <Link
                  key={href}
                  href={href}
                  className="bg-surface-2 border border-border rounded-xl p-5 hover:border-accent/40 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center flex-shrink-0">
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-foreground">{title}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeColor}`}>{badge}</span>
                        </div>
                        <p className="text-xs text-muted mb-2">{subtitle}</p>
                        <p className="text-sm text-foreground-muted">{description}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs text-muted">For:</span>
                          {audience.map((a) => (
                            <span key={a} className="text-xs bg-surface text-foreground-muted px-2 py-0.5 rounded-full border border-border">
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
          </section>
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
