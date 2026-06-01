import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  change?: number;
  icon?: ReactNode;
  sub?: string;
  accent?: boolean;
}

export function StatCard({ label, value, change, icon, sub, accent }: StatCardProps) {
  const isPositive = (change ?? 0) > 0;
  const isNeutral = change === undefined || change === 0;

  return (
    <div
      className={cn(
        "rounded-xl border p-5 flex flex-col gap-3 transition-all duration-200 hover:border-border",
        accent
          ? "bg-accent/5 border-accent/20 hover:bg-accent/10"
          : "bg-surface border-border/50 hover:bg-surface-2/50"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>
        {icon && (
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent ? "bg-accent/10" : "bg-surface-2")}>
            {icon}
          </div>
        )}
      </div>

      <div>
        <p className={cn("text-2xl font-bold", accent ? "text-accent" : "text-foreground")}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>

      {!isNeutral && (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className={cn("text-xs font-medium", isPositive ? "text-green-400" : "text-red-400")}>
            {formatPercent(change!)} vs last period
          </span>
        </div>
      )}
    </div>
  );
}
