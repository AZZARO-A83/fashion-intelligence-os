"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HelpButton } from "@/components/ui/help-button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  badge?: string;
}

export function PageHeader({ title, subtitle, action, badge }: PageHeaderProps) {
  const pathname = usePathname();
  return (
    <div className="flex items-start justify-between px-8 py-6 border-b border-border bg-surface/50 backdrop-blur sticky top-0 z-10">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 uppercase tracking-wider">
              {badge}
            </span>
          )}
          {/* Auto-shows the plain-English "?" help for this route */}
          <HelpButton section={pathname} />
        </div>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
