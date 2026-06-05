"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
  PenTool,
  Image,
  BarChart3,
  Sparkles,
  CalendarDays,
  Bell,
  Briefcase,
  FlameKindling,
  CalendarRange,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiBudget } from "./ai-budget";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/monthly-plan", label: "Monthly Plan", icon: CalendarDays, highlight: true },
  { href: "/calendar", label: "Event Calendar", icon: CalendarRange },
  { href: "/sales", label: "Sales Insights", icon: ShoppingCart },
  { href: "/trends", label: "Trend Engine", icon: TrendingUp },
  { href: "/trends/alerts", label: "Trend Alerts", icon: Bell },
  { href: "/competitors", label: "Competitors", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: Zap },
  { href: "/content", label: "Content AI", icon: PenTool },
  { href: "/inspiration", label: "Inspiration", icon: Image },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const agencyItems = [
  { href: "/agency", label: "Agency Hub", icon: Briefcase },
  { href: "/agency/flash", label: "Flash Brief", icon: FlameKindling, badge: "3-day" },
  { href: "/agency/weekly", label: "Weekly Report", icon: CalendarRange },
  { href: "/agency/monthly", label: "Monthly Strategy", icon: LineChart },
];

export function Sidebar() {
  const pathname = usePathname();

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

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, highlight }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-accent text-black"
                  : (highlight && !active)
                  ? "text-accent border border-accent/20 bg-accent/5 hover:bg-accent/10"
                  : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Agency Intelligence Section */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
            Agency Intelligence
          </p>
        </div>
        {agencyItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-accent text-black"
                  : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-semibold">
                  {badge}
                </span>
              )}
            </Link>
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
