"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  PenTool,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiBudget } from "./ai-budget";

// 5 clean sections. Sub-links appear only when you're inside that section —
// so the top level is always just 5, no tab-maze.
const SECTIONS = [
  {
    href: "/", label: "Overview", icon: LayoutDashboard,
    subs: [
      { href: "/sales", label: "Sales detail", group: "Store performance" },
      { href: "/analytics", label: "Analytics", group: "Store performance" },
    ],
  },
  {
    href: "/trends", label: "Trends", icon: TrendingUp,
    subs: [{ href: "/trends/alerts", label: "Urgent alerts", group: "Market signals" }],
  },
  { href: "/competitors", label: "Competitors", icon: Users, subs: [] },
  {
    href: "/content", label: "Create", icon: PenTool,
    subs: [
      { href: "/campaigns", label: "Campaigns", group: "Creative work" },
      { href: "/inspiration", label: "Inspiration", group: "Creative work" },
    ],
  },
  {
    href: "/agency", label: "Reports", icon: Briefcase,
    subs: [
      { href: "/agency/growth", label: "Generated growth report", group: "Reports" },
      { href: "/agency/flash", label: "Flash brief", group: "Reports" },
      { href: "/agency", label: "Planning hub", group: "Reports" },
    ],
  },
];

function groupedSubs(subs: (typeof SECTIONS)[number]["subs"]) {
  return subs.reduce<Record<string, typeof subs>>((acc, sub) => {
    const group = sub.group || "General";
    acc[group] = acc[group] || [];
    acc[group].push(sub);
    return acc;
  }, {});
}

export function Sidebar() {
  const pathname = usePathname();
  const inSection = (s: (typeof SECTIONS)[number]) =>
    pathname === s.href ||
    (s.href !== "/" && pathname.startsWith(s.href)) ||
    s.subs.some((x) => pathname === x.href || pathname.startsWith(x.href));

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground leading-tight">Fashion Intelligence</p>
            <p className="text-[10px] text-muted">Egypt Campaign OS</p>
          </div>
        </div>
      </div>

      {/* Brand pill */}
      <div className="px-4 py-3 border-b border-border">
        <div className="bg-surface-2 rounded-lg px-3 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-foreground-muted font-medium">Debackers Egypt</span>
        </div>
      </div>

      {/* Nav — 5 sections */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const open = inSection(s);
          const active = pathname === s.href;
          return (
            <div key={s.href}>
              <Link
                href={s.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150",
                  active || (open && s.href !== "/")
                    ? "bg-accent text-black"
                    : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {s.label}
              </Link>
              {open && s.subs.length > 0 && (
                <div className="ml-6 mt-1 mb-1 space-y-0.5 border-l border-border pl-3">
                  {Object.entries(groupedSubs(s.subs)).map(([group, subs]) => (
                    <div key={group} className="pt-1">
                      <p className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted">{group}</p>
                      {subs.map((sub) => {
                        const subActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "block px-2 py-1.5 rounded-md text-xs transition-colors",
                              subActive ? "text-accent font-medium" : "text-muted hover:text-foreground"
                            )}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-3">
        <AiBudget />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-xs font-bold text-accent">
            AI
          </div>
          <div>
            <p className="text-xs text-foreground font-medium">Powered by Claude</p>
            <p className="text-[10px] text-muted">Egypt Market Intelligence</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
