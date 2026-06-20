import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  change?: number;
  icon?: ReactNode;
  sub?: string;
  explain?: string;
  accent?: boolean;
}

const DEFAULT_EXPLANATIONS: Record<string, string> = {
  "Net Sales": "Main sales health number: paid order value after discounts and returns.",
  "Total Orders": "Demand volume: how many orders were placed in the selected period.",
  "Avg Order Value": "Basket quality: average money per order. Higher AOV can offset fewer orders.",
  "Repeat Buyers": "Retention signal: customers who came back and bought again.",
  "Abandoned Carts": "Checkout demand that did not convert. Use this to size recovery work.",
  "Recovery Opportunity": "Estimated recoverable revenue from abandoned cart value.",
  "Growth vs prev period": "Net sales change against the same-length previous period.",
  "Orders growth": "Order volume change against the same-length previous period.",
};

export function StatCard({ label, value, change, icon, sub, explain, accent }: StatCardProps) {
  const isPositive = (change ?? 0) > 0;
  const isNeutral = change === undefined || change === 0;
  const explanation = explain || DEFAULT_EXPLANATIONS[label];

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
        {explanation && <p className="text-[11px] text-foreground-muted mt-2 leading-relaxed">{explanation}</p>}
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
